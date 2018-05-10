Vue.component('message', {
  props: ['message'],
  data: function () {
    return {
      username: "",
      password: "",
      didSubmitIncorrectCreds: false,
    }
  },

  filters: {
    timeago: function (value) {
      if (!value) return ''
      return Moment(value).fromNow();
    },

    fullName: function(id) {
      if(!id) return '';
      console.log(id);
      var user = app.users.filter(u => u.user_id == id)[0];
      return user.first_name + " " + user.last_name;
    }
  },

  template: 
  `<div class="message">
    <div>{{message.content}}</div>
    </div>`
})