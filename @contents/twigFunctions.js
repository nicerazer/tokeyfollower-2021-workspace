exports.twigFunctions = [
  {
      name: "lang",
      func: function (lang) {
          return {
            'account.title': 'Bob Joe Sandman',
            'signin.logout': '#',
            'neworder.message.success': 'Selesai kemaskini!',
            'neworder.id': 'ID',
            'neworder.service': 'Servis',
            'neworder.link': 'Link',
            'neworder.quantity': 'Kuantiti',
            'neworder.charge': 'Bayaran',
            'neworder.balance': 'Baki',

            'neworder.category': 'Category',
          }[lang];
      }
  },
  {
      name: "page_url",
      func: function (pageUrl) {
          return {
            'index': '#',
            'account': './page.account.html',
            'logout': './page.logout.html'
          }[pageUrl];
      }
  },
];