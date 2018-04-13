var socket = io('http://localhost:8080/');


socket.on('msg', function(msg){
	app.messages.push(msg);
});

var app = new Vue({
	el: '#app',
	data: {
		messageInput: "",
		messages: [
			"This is a message",
			"It has some text"
		]
	},

	methods: {
		sendMessage: function(e) {
			e.preventDefault();
			socket.emit('msg', this.messageInput)
			this.messageInput = "";
			return;
		}
	}
})