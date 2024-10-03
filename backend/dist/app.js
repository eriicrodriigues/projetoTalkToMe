"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.App = void 0;
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const socket_io_1 = require("socket.io");
class App {
    constructor() {
        this.app = (0, express_1.default)();
        this.http = new http_1.default.Server(this.app);
        this.io = new socket_io_1.Server(this.http, {
            cors: {
                origin: '*',
            },
        });
    }
    listen() {
        this.http.listen(3333, () => {
            console.log('Server is running on port 3333');
        });
    }
    listenSocket() {
        this.io.of('/streams').on('connection', this.socketEvents);
    }
    socketEvents(socket) {
        console.log('Socket connected: ' + socket.id);
        socket.on('subscribe', (data) => {
            console.log('usuario inserido na sala: ' + data.roomId);
            socket.join(data.roomId);
            socket.join(data.socketId);
            const roomsSession = Array.from(socket.rooms);
            if (roomsSession.length > 1) {
                socket.to(data.roomId).emit('new user', {
                    socketId: socket.id,
                    username: data.username,
                });
            }
        });
        socket.on('newUserStart', (data) => {
            console.log('Novo usuário chegou:', data);
            socket.to(data.to).emit('newUserStart', {
                sender: data.sender,
            });
        });
        socket.on('sdp', (data) => {
            socket.to(data.to).emit('sdp', {
                description: data.description,
                sender: data.sender,
            });
        });
        socket.on('ice candidates', (data) => {
            socket.to(data.to).emit('ice candidates', {
                candidate: data.candidate,
                sender: data.sender,
            });
        });
        socket.on('chat', (data) => {
            console.log('🚀 ~ App ~ socket.on ~ data:', data);
            socket.broadcast.to(data.roomId).emit('chat', {
                message: data.message,
                username: data.username,
                time: data.time,
            });
        });
        socket.on('disconnect', (data) => {
            console.log('Socket desconectado:' + socket.id);
            socket.disconnect();
        });
    }
}
exports.App = App;
