# GeoRota

## Autenticacao

- `POST /auth/token` com `username` (email) e `password` retorna `access_token` (JWT).
- As rotas das demais entidades exigem header `Authorization: Bearer <token>`.
- Usuario padrao criado pelo seed: `admin@geo-rota.local` com senha `admin123`.
- Use `GET /usuarios/me` para validar o token e recuperar os dados do usuario autenticado.
