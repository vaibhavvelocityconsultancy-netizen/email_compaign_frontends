# Frontend Friend

create frotnend only

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://front-page-fizz.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/f9a1521d-b72d-4dc8-8e4f-8943959c0cca).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

The frontend sends API requests to `/api`, proxied to Django at `http://127.0.0.1:8000` during development. Start Django from `email_compaign` with `python manage.py runserver`. To use a separately hosted API, set `VITE_API_BASE_URL` to its `/api` URL before starting or building the frontend.
