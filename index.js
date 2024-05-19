const http = require("http");
const Socket = require("websocket").server;
const PORT = process.env.PORT || 3000;
const server = http.createServer(() => {});

server.listen(PORT, () => {
    console.log(`Server Running at ${PORT}`);
});

const webSocket = new Socket({ httpServer: server });
const users = [];

webSocket.on('request', (req) => {
    const connection = req.accept();

    connection.on('message', (message) => {
        try {
            const data = JSON.parse(message.utf8Data);
            console.log(data);
            const user = findUser(data.name);

            switch (data.type) {
                case "store_user":
                    if (user !== null) {
                        connection.send(JSON.stringify({
                            type: 'user already exists'
                        }));
                        return;
                    }

                    const newUser = {
                        name: data.name,
                        conn: connection
                    };
                    users.push(newUser);
                    break;

                case "start_call":
                    let userToCall = findUser(data.target);

                    if (userToCall) {
                        connection.send(JSON.stringify({
                            type: "call_response",
                            data: "user is ready for call"
                        }));
                    } else {
                        connection.send(JSON.stringify({
                            type: "call_response",
                            data: "user is not online"
                        }));
                    }
                    break;

                case "create_offer":
                    let userToReceiveOffer = findUser(data.target);

                    if (userToReceiveOffer) {
                        userToReceiveOffer.conn.send(JSON.stringify({
                            type: "offer_received",
                            name: data.name,
                            data: data.data.sdp
                        }));
                    }
                    break;

                case "create_answer":
                    let userToReceiveAnswer = findUser(data.target);
                    if (userToReceiveAnswer) {
                        userToReceiveAnswer.conn.send(JSON.stringify({
                            type: "answer_received",
                            name: data.name,
                            data: data.data ? data.data.sdp : null
                        }));
                    }
                    break;

                case "ice_candidate":
                    let userToReceiveIceCandidate = findUser(data.target);
                    if (userToReceiveIceCandidate) {
                        userToReceiveIceCandidate.conn.send(JSON.stringify({
                            type: "ice_candidate",
                            name: data.name,
                            data: {
                                sdpMLineIndex: data.data.sdpMLineIndex,
                                sdpMid: data.data.sdpMid,
                                sdpCandidate: data.data.sdpCandidate
                            }
                        }));
                    }
                    break;

                case "end_call":
                    let userToNotifyEndCall = findUser(data.target);
                    if (userToNotifyEndCall) {
                        userToNotifyEndCall.conn.send(JSON.stringify({
                            type: "call_ended",
                            name: data.name
                        }));
                    }
                    break;
            }
        } catch (error) {
            console.error('Invalid message format', error);
        }
    });

    connection.on('close', () => {
        users.forEach((user, index) => {
            if (user.conn === connection) {
                users.splice(index, 1);
            }
        });
    });
});

const findUser = (username) => {
    for (let i = 0; i < users.length; i++) {
        if (users[i].name === username)
            return users[i];
    }
    return null;
};
