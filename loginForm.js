Vue.component('login-form', {
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
  `<div class="login-form">
  	<h2>welcome.</h2>
  	<p v-if="didSubmitIncorrectCreds">your credentials were incorrect. please try again.</p>
  	<input placeholder="username" v-model="username"><br>
  	<input type="password" placeholder="password" v-model="password"><br>
  	<button @click="startLogin">log in</button><br>
  	<p>or: <a href="#" @click.prevent.stop.once="goToRegistration">register</a></p>
  </div>`
})