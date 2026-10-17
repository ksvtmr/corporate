.PHONY: dev build preview lint test e2e check clean push

dev:
	npm run dev

build:
	npm run build

preview:
	npm run preview

lint:
	npm run typecheck && npm run i18n:check

test:
	npm test

e2e:
	npm run test:e2e

check:
	npm run check

push:
	git push origin HEAD

clean:
	rm -rf dist
