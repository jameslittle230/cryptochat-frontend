Vue.component('chat-select', {
  data: function () {
    return {
      username: "",
      password: "",
      didSubmitIncorrectCreds: false,
    }
  },

  methods: {
  	startLogin: function() {
  		if(this.username == "") {
  			this.didSubmitIncorrectCreds = true;
  			return;
  		}

  		var me = this;

  		axios({
			method: 'post',
			url: 'login',
			data: {
				"username": this.username,
				"password": this.password
			}
		}).then(function(response) {
			if(response.data.success) {
				console.log(response.data);
				me.didSubmitIncorrectCreds = false;
				me.$root.processSuccessfulLoginWithCredentials(response.data.user, me.password);
			} else {
				me.username = "";
				me.password = "";
				me.didSubmitIncorrectCreds = true;
			}
		})
  	},

  	goToRegistration: function() {
  		console.log("let's register");
  	}
  },

  template: 
  `<div class="">Chat Select</div>`
})