.PHONY: all build tests test serve clean

COFFEE:=./node_modules/.bin/coffee

all: ocean.js

build: ocean.js ocean.min.js

ocean.js: lib/*js version
	@$(COFFEE) -v > /dev/null
	$(COFFEE) bin/render.coffee --set-version $(VER) lib/all.js > $@

ocean.min.js: lib/*js version
	@$(COFFEE) -v > /dev/null
	$(COFFEE) bin/render.coffee --set-version $(VER) --minify lib/all.js > $@

ocean.pretty.js: lib/*js version
	@$(COFFEE) -v > /dev/null
	$(COFFEE) bin/render.coffee --set-version $(VER) --minify --pretty lib/all.js > $@

tests/html/lib/ocean.js: ocean.js
	cp $< $@

tests/html/lib/%.js: tests/html/src/%.coffee
	@$(COFFEE) -v > /dev/null
	$(COFFEE) -o tests/html/lib/ -c --bare $<

build_tests: tests/html/lib/ocean.js tests/html/lib/tests.js \
		tests/html/lib/unittests.js tests/html/lib/domtests.js \
		tests/html/lib/endtoendtests.js

test: tests
tests: build_tests
	node tests/server.js


serve:
	@if [ -e .pidfile.pid ]; then			\
		kill `cat .pidfile.pid`;		\
		rm .pidfile.pid;			\
	fi

	@while [ 1 ]; do					\
		make build_tests;				\
		echo " [*] Running http server";		\
		make test &					\
		SRVPID=$$!;					\
		echo $$SRVPID > .pidfile.pid;			\
		echo " [*] Server pid: $$SRVPID";		\
		inotifywait -r -q -e modify . ../ocean-node;	\
		kill `cat .pidfile.pid`;			\
		rm -f .pidfile.pid;				\
		sleep 0.1;					\
	done

clean:
	rm -f ocean*.js tests/html/lib/*.js

# To release:
#   0) 'make prepare-release'
#   1) commit everything you need
#   2) amend 'version' file (don't commit)
#   3) run 'make tag', and git push/git push --tag as suggested
#   4) run 'make upload', and suggested commands

RVER:=$(shell cat version)
VER:=$(shell ./VERSION-GEN)
# The first two dots: 1.2.3 -> 1.2
MAJVER:=$(shell echo $(VER)|sed 's|^\([^.]\+[.][^.]\+\).*$$|\1|' )

.PHONY: prepare-release tag upload
prepare-release:
	make clean
	[ -e ../ocean-client-gh-pages ] || 				\
		git clone `git remote -v|tr "[:space:]" "\t"|cut -f 2`	\
			--branch gh-pages ../ocean-client-gh-pages
	(cd ../ocean-client-gh-pages; git pull;)

#-git tag -d v$(RVER)
tag:
	git commit $(TAG_OPTS) version Changelog -m "Release $(RVER)" --allow-empty
	git tag -s v$(RVER) -m "Release $(RVER)"
	@echo ' [*] Now run'
	@echo 'git push; git push --tag'

ARTIFACTS=\
	ocean-$(VER).js \
	ocean-$(VER).min.js \
	ocean-$(MAJVER).js \
	ocean-$(MAJVER).min.js

upload: build
	echo "VER=$(VER) MAJVER=$(MAJVER)"
	cp ocean.js     ../ocean-client-gh-pages/ocean-$(VER).js
	cp ocean.min.js ../ocean-client-gh-pages/ocean-$(VER).min.js
	cp ocean.js     ../ocean-client-gh-pages/ocean-$(MAJVER).js
	cp ocean.min.js ../ocean-client-gh-pages/ocean-$(MAJVER).min.js
	(cd ../ocean-client-gh-pages;	\
		git add $(ARTIFACTS); \
		git commit -m "Release $(VER)"; \
		node generate_index.js > index.html; \
		git add index.html; \
		git commit --amend -m "Release $(VER)";)
	@echo ' [*] Now run: '
	@echo '(cd ../ocean-client-gh-pages; git push; )'
	@echo '(cd ../ocean-client-gh-pages; 	\
		s3cmd put --acl-public index.html $(ARTIFACTS) s3://ocean; );'
