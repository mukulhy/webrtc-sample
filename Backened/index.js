// // index.js

// const http = require('http');
// const express = require('express');
// const { Server: SocketIO } = require('socket.io');
// const path = require('path');
// const cors = require('cors');  // Import the cors package

// const app = express();
// const server = http.createServer(app);

// const io = new SocketIO(server, {
//     cors: {
//       origin: "*",  // Allow all origins for simplicity, but you can restrict it to your specific domain
//       methods: ["GET", "POST"]
//     }
//   });
// const PORT = process.env.PORT || 8000;
// app.use(cors());  // Use the cors middleware
// app.use(express.static(path.resolve('./public')));

// // Create a users map to keep track of users
// const users = new Map();

// io.on('connection', socket => {
//     console.log(`user connected: ${socket.id}`);
//     users.set(socket.id, socket.id);

//     // Emit all users to the newly connected user
//     socket.emit('allUsers', Array.from(users.keys()));

//     // emit that a new user has joined as soon as someone joins
//     socket.emit('user:joined', socket.id);
//     // Notify all users about the new user
//     socket.broadcast.emit('user-connected', socket.id);

//     socket.on('outgoing:call', data => {
//         console.log('outgoing socket', data);
//         const { offer, to } = data;
//         socket.to(to).emit('incoming:call', { from: socket.id, offer: offer });
//     });

//     socket.on('call:accepted', data => {
//         console.log('call accepted socket', data);
//         const { answer, to } = data;
//         socket.to(to).emit('call:accepted', { from: socket.id, answer });
//     });

//     socket.on('ice-candidate', data => {
//         const { to, candidate } = data;
//         socket.to(to).emit('ice-candidate', { candidate , from : to});
//     });

//     socket.on('disconnect', () => {
//         console.log(`user disconnected: ${socket.id}`);
//         users.delete(socket.id);
//         io.emit('user-disconnected', socket.id);
//     });
// });


// server.listen(PORT, () => console.log(`Server started at PORT:${PORT}`));




// index.js

const http = require('http');
const express = require('express');
const { Server: SocketIO } = require('socket.io');
const path = require('path');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

const io = new SocketIO(server, {
    cors: {
         // Allow all origins for simplicity, but you can restrict it to your specific domain
      methods: ["GET", "POST"]
    }
  });
const PORT = process.env.PORT || 8000;
app.use(cors()); 
// Create a users map to keep track of users
const users = new Map();

io.on('connection', socket => {
    console.log(`user connected: ${socket.id}`);
    users.set(socket.id, socket.id);

    // emit that a new user has joined as soon as someone joins
    socket.broadcast.emit('users:joined', socket.id);
    socket.emit('hello', { id: socket.id });

    socket.on('outgoing:call', data => {
        const { fromOffer, to } = data;
        // console.log('backened outgoing:call fired', data);
        console.log('Socket connected:', socket.connected);
        socket.to(to).emit('incomming:call', { from: socket.id, offer: fromOffer });
    });

    socket.on('call:accepted', data => {
        const { answere, to } = data;
        socket.to(to).emit('incomming:answere', { from: socket.id, offer: answere })
    });


    socket.on('disconnect', () => {
        console.log(`user disconnected: ${socket.id}`);
        users.delete(socket.id);
        socket.broadcast.emit('user:disconnect', socket.id);
    });
});


app.use(express.static( path.resolve('./public') ));

app.get('/users', (req, res) => {
    return res.json(Array.from(users));
});

server.listen(PORT, () => console.log(`Server started at PORT:${PORT}`));
