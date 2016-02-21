var ejs = require('ejs'),
	fs = require('fs-extra'),
	yaml = require('js-yaml'),
	path = require('path'),
	marked = require('marked');

var _config = yaml.safeLoad(fs.readFileSync(path.join(__dirname, './_config.yml'), 'utf8')),
	content = fs.readFileSync(path.join(__dirname, './source/README.md'), 'utf8'),
	str = fs.readFileSync(path.join(__dirname, './theme/layout/index.ejs'), 'utf8');

content = marked(content);

var ret = ejs.render(str, {
	config: _config,
	content: content
});

console.log(ret);

fs.writeFileSync(path.join(__dirname, './public/index.html'), ret);

fs.copy(path.join(__dirname, './theme/source'), path.join(__dirname, './public'), function (err) {
  if (err) {
    console.error(err);
  } else {
    console.log("success!");
  }
})