Vue.component('register-form', {
	data: function () {
		return {
			username: "",
			password: "",
			password2: "",
			first: "",
			last: "",
			didSubmitIncorrectCreds: false,
			submitButtonIsDisabled: false,
			errorReason: "",
		}
	},

	methods: {
		resetData: function() {
			this.username = "";
			this.password = "";
			this.password2 = "";
			this.first = "";
			this.last = "";
			this.submitButtonIsDisabled = false;
		},

		startLogin: function() {
			if(this.password != this.password2) {
				this.resetData();
				this.didSubmitIncorrectCreds = true;
				this.errorReason = "Your passwords must match.";
				return;
			}

			if(!this.submitButtonIsDisabled) {
				this.submitButtonIsDisabled = true;
				NProgress.start();

				let key = app.generateNewRsaKeypair(this.password);

				axios({
					method: 'post',
					url: 'register',
					data: {
						"username": this.username,
						"password": this.password,
						"first": this.first,
						"last": this.last,
						"key": key
					}
				}).then((response) => {
					if(response.data.success) {
						this.didSubmitIncorrectCreds = false;
						app.processSuccessfulLoginWithCredentials(response.data.user, this.password);
					} else {
						NProgress.done();
						this.resetData();
						this.didSubmitIncorrectCreds = true;
						this.errorReason = response.data.errorReason;
					}
				}).catch((error) => {
					console.log(error);
					NProgress.done();
					this.resetData()
					this.didSubmitIncorrectCreds = true;
					this.errorReason = error.response.data.message;
				})
			}
		},

		goToLogin: function() {
			app.uiState = 'login';
		}
	},

	mounted: function() {
		NProgress.configure({ showSpinner: false });
	},

	template: 
	`<div class="login-form">
		<h2>Make an account!</h2>
		<p v-if="didSubmitIncorrectCreds">{{ errorReason }}</p>
		<input placeholder="Username" v-model="username" autofocus><br>
		<input type="password" placeholder="Password" v-model="password"><br>
		<input type="password" placeholder="Password (again)" v-model="password2" /><br>
		<input type="text" v-model="first" placeholder="First Name"><br>
		<input type="text" v-model="last" placeholder="Last Name" v-on:keydown.enter="startLogin"><br>
		<button @click="startLogin" v-bind:disabled="this.submitButtonIsDisabled">{{ submitButtonIsDisabled ? "Loading..." : "Create Account" }}</button><br>
		<p>Already have an account? <a href="#" @click.prevent.stop.once="goToLogin">Log in</a></p>
	</div>`
})