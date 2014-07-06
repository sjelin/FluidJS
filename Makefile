fluid-prod.js: fluid.js
	uglifyjs fluid.js -m -c -d DEBUG=false -o fluid-prod.js

fluid-debug.js: fluid.js
	uglifyjs fluid.js -c -d DEBUG=true -o fluid-debug.js

fluid-forms-prod.js: fluid-forms.js
	uglifyjs fluid-forms.js -m -c -d DEBUG=false -o fluid-forms-prod.js

fluid-forms-debug.js: fluid-forms.js
	uglifyjs fluid-forms.js -c -d DEBUG=true -o fluid-forms-debug.js

