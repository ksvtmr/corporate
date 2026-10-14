.PHONY: dev build preview lint test clean push

dev:
	npm run dev

build:
	npm run build

preview:
	npm run preview

lint:
	npx tsc --noEmit

test:
	npm test

push:
	git push origin HEAD

clean:
	rm -rf dist
