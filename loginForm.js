Vue.component('login-form', {
  data: function () {
    return {
      username: "",
      password: "",
      didSubmitIncorrectCreds: false,
      submitButtonIsDisabled: false,
    }
  },

  methods: {
  	startLogin: function() {
  		if(this.username == "") {
  			this.didSubmitIncorrectCreds = true;
  			return;
  		}

		NProgress.configure({ showSpinner: false });
		this.submitButtonIsDisabled = true;
  		NProgress.start();

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
				app.processSuccessfulLoginWithCredentials(response.data.user, me.password);
			} else {
				NProgress.done();
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
  	<h2>Welcome to PenguinEgg.</h2>
  	<p>By <a href="https://jameslittle.me">James Little</a></p>
  	<p v-if="didSubmitIncorrectCreds">Your credentials were incorrect. Please try again.</p>
  	<input placeholder="Username" v-model="username" autofocus><br>
  	<input type="password" placeholder="Password" v-model="password" v-on:keydown.enter="startLogin"><br>
  	<button @click="startLogin" v-bind:disabled="this.submitButtonIsDisabled">{{ submitButtonIsDisabled ? "Loading..." : "Log in" }}</button><br>
  	<p>Or <a href="#" @click.prevent.stop.once="goToRegistration">register</a></p>
  </div>`
})