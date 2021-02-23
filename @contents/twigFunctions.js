exports.twigFunctions = [
  {
      name: "lang",
      func: function (lang) {
          return {
            'account.title': 'Bob Joe Sandman',
            'signin.logout': '#',
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