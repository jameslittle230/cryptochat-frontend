Vue.component('message', {
  props: ['message'],
  data: function () {
    return {
      username: "",
      password: "",
      didSubmitIncorrectCreds: false,
    }
  },

  computed: {
    inMultipartyChat: function() {
      return app.chats.filter(c => c.chat_id == app.selectedChat)[0].members.length > 2;
    },

    me: function() {
      return this.message.snd == app.currentUser.user_id
    },

    fullName: function() {
      var user = app.users.filter(u => u.user_id == this.message.snd)[0];
      return user.first_name + " " + user.last_name;
    },

    backgroundColorStyleObject: function() {
      var hue = parseInt(CryptoJS.MD5(this.fullName).toString().substring(0, 2), 16);
      var colorString = "hsl(" + hue + ", 75%, 80%)";

      if(this.inMultipartyChat && !this.me) {
        return {
          backgroundColor: colorString
        }
      }

      return {};
    }
  },

  filters: {
    timeago: function (value) {
      if (!value) return ''
      console.log(value);
      return Moment.unix(value).fromNow();
    },

    fullName: function(id) {
      if(!id) return '';
      console.log(id);
    }
  },

  template: 
  `<div class="message" 
    v-bind:style="backgroundColorStyleObject"
    v-bind:class="{me: me}">

      <div>{{message.content}}</div>
      <div><small>
        <span v-if="inMultipartyChat && !me">{{fullName}} &bullet; </span>
        {{message.timestamp | timeago}}</small>
      </div>
    </div>`
})