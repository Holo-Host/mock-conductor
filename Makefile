#
# Project
#
package-lock.json:	package.json
	touch $@
node_modules:		package-lock.json
	npm install
	touch $@

#
# Testing
#
test:
	npx jest ./tests

#
# Repository
#
clean-remove-chaff:
	@find . -name '*~' -exec rm {} \;
clean-files:		clean-remove-chaff
	git clean -nd
clean-files-force:	clean-remove-chaff
	git clean -fd
clean-files-all:	clean-remove-chaff
	git clean -ndx
clean-files-all-force:	clean-remove-chaff
	git clean -fdx

#
# NPM
#
preview-package:	clean-files test
	npm pack --dry-run .
create-package:		clean-files test
	npm pack .
publish-package:	clean-files test
	npm publish --access public .
