.PHONY: dev build preview lint install clean

dev:
	npm run dev

build:
	npm run build

preview:
	npm run preview

lint:
	npm run lint

install:
	npm install

clean:
	rm -rf dist node_modules/.vite
