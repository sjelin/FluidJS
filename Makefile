all: fluid.min.js fluid-forms.min.js

fluid.min.js: fluid.js
	uglifyjs fluid.js -m -c -o fluid.min.js

fluid-forms.min.js: fluid-forms.js
	uglifyjs fluid-forms.js -m -c -o fluid-forms.min.js
