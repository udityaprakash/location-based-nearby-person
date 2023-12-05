const express = require('express');
const http = require('http');
const socketIO = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

const PORT = 8000;
var users = [];

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

io.on('connection', (socket) => {
  console.log('A user connected');

  // Listen for location data from the client
  socket.on('location', (data) => {
    // Assuming data structure is { name, latitude, longitude }
    const { name, latitude, longitude } = data;

    console.log(`${socket.id} - ${name} is at ${latitude}, ${longitude}`);

    let userFound = users.find(user => user.id === socket.id);
    const user = { id: socket.id, name, latitude, longitude };
    if(!userFound){
      users.push(user);
    }


    // Calculate distance (you may want to use a more accurate formula)
    var nearbyUsers = getNearbyUsers(user);
    console.log("nearby user for " + socket.id +" is "+ nearbyUsers.name);
    io.to(socket.id).emit('nearby_users', nearbyUsers);
    nearbyUsers.forEach(us => {
      io.to(us.id).emit('nearby_users', getNearbyUsers(us));
      
    });
    console.log("all users are "+ users.name);

    // Broadcast the updated list to all connected clients
    io.emit('all_users', users);
  });

  socket.on('disconnect', () => {
    const index = users.findIndex(user => user.id === socket.id);
    if (index !== -1) {
      users.splice(index, 1);
    }

    // Broadcast the updated list to all connected clients
    io.emit('all_users', users);

    console.log('User disconnected');
  });
});

function getDistance(user1, user2) {
  const lat1 = user1.latitude;
  const lon1 = user1.longitude;
  const lat2 = user2.latitude;
  const lon2 = user2.longitude;

  // Formula to calculate distance between two points (you may want to use a more accurate formula)
  const R = 6371; // Radius of the Earth in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return distance;
}

function getNearbyUsers(user) {
  // Sort users by distance from the current user
  const sortedUsers = users
    .filter(u => u.id !== user.id) // Exclude the current user
    .map((u) => ({
      ...u,
      distance: calculateDistance(user.latitude, user.longitude, u.latitude, u.longitude).toFixed(2),
    }))
    .sort((a, b) => getDistance(user, a) - getDistance(user, b));

  return sortedUsers;
}

function calculateDistance(lat1, lon1, lat2, lon2) {
  // Use a simple formula to calculate distance (you might want to use a more accurate algorithm in production)
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c * 1000; // Distance in meters
  return distance;
}

function toRad(degrees) {
  return (degrees * Math.PI) / 180;
}

server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
