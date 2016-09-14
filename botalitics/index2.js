const botalitics = require('./module');

const message = { 
    sender: { id: '1388594137833781' },
    recipient: { id: '271917959838268' },
    timestamp: 1473757548761,
    message:
    { 
        mid: 'mid.1473757548667:944e79f894a92ef811',
        seq: 7598,
        text: 'hi' 
    } 
}

const message2 = { 
    sender: { id: '1388594137833781' },
    recipient: { id: '271917959838268' },
    timestamp: 1473757548761,
    message:
    { 
        mid: 'mid.1473757548667:944e79f894a92ef811',
        seq: 7598,
        text: 'how are you' 
    } 
}

botalitics.logIncoming(message);
botalitics.logIncoming(message2);