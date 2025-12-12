# ⚠️ CONFIGURAÇÃO FIREBASE NO RENDER

**NUNCA commite credenciais do Firebase!** Use variáveis de ambiente.

## 🔐 Configurar no Render

1. Render Dashboard → seu serviço → **Environment**
2. Adicione as seguintes variáveis:

### Variáveis Obrigatórias

```
FIREBASE_PROJECT_ID=flixpatrol-api

FIREBASE_PRIVATE_KEY_ID=12f686fbb4b987c49c27bf3938871e3f5fb89fbb

FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDCjtOPXtHixT0h
7bov8k8dzx4tMNOYyZrdVAZqBmesTNRdqiOdHjvioX0O0Ro96dO4l3PyqJmuwDWU
BgcGtyUUOmpaw9rLq5BsHBc+uyWErGpin7gD3eEybmH0OEN4o4Qk26RRZRx5Y9A8
8ExKFJGr3xuwON6LWn+VRJ8seIMJ7WsP6FakI5C4hp64THmacKoZ8BqFTWlWltnW
mnOGraCCjhyX5nT4SGOuNnFBmL/QR1x4tMkaZNPl/yitDUUveOM3TnKeak1g6Ngc
dQHiOdnHV2Kr1p5IbXzAICzc0BK4RF1WtuS2oesl4bsyUaJZ+5nkZ5LhzJb9Wb72
6Sdg2r5DAgMBAAECggEAAdVJrgSlMp9MI6kzQ2djknLUpHVc0Qg5QtObWd1kla2F
pLpJKp5RzyFZZc3XkvTEj20x5PvsssZR2uqxn0ETgtzICsHkql2b90DOgUNPJ7Be
Mj6yA6tQB2Md3ii3jgfwY06EflXXDle/6wsSlPIbq0RnZOIsSqDYKeZjH46lIW9M
g+u82BnQTCT5Pauc3k9rLdByZ7bym1ECtV0WXxrCofh6dSlGhSo/ui6Q+F5c+PIl
bAOJ5RFMdPZ2utpMWkamKewOts1kvOoZFO686WN/COgQ0cAzBW6SQRm65VWIyHrt
QG0IJxt4yWQMSC0bnzA6Vk/9UyzdcsqH8Ytjy6bmoQKBgQD3wenq81If9jHj+DdS
cG3wflPNMtLhmbfoTRI2NWjqAgkGq5IiQxdkMlc/JPPhlnjqCw5zKYMZwzYPt/2C
oQPUoQLMHTFVLEd88BwEsnWX8MOeKZHqW/TRXtLyFE1P3vTb3SUgGCDrIJflSWSf
OsAqF1JaGhIPdTTjyqRaCEAE4QKBgQDJB9Nm/XL1pdH6iQE8wQESOvZhkcMnp3i9
j2u+YMKlM5H3mfCK6EejD/XvL150y7AH0PTvfzVA+L0zxf7icq4WBRpCcWyRQ2pt
Mc/UTGkVGruuMqmJ/0vRcyKHqQg0pMei6MPmJFwlmL0ECsJlC8842mvPnfwwMvUV
Lp41mCkDowKBgFdPD5bLblpzEPvMQfqcQjHo4rFCQsxbtlJ3rn5J7hHg67tdBN9s
EzctAk/vPr51n2CiytHMhDW09D0v0neRNF9e6jRx6SuhsgOWPdlt5kDICLeY4KHd
C/YoW2ARxXjrEhDU6rtXpWoWj1Cuv3XZZ1St6Uh1PX4TCLNpeud7VswhAoGBALcI
rww4ezD512M61quQNv94O9e+NWenbaF6MelWhCKR/7bmrEJtFrx6zbsG8AN7aTzU
ng5pTf1n/Cxle5qGO8bEwpH4X5crQH1HOyjaoVqbyoHiksaYcVm0cJ3/4v67gSDs
uWCTfmqk1IQXn8MMq5HiHQMdnv3rh4XPujCl58HtAoGBAJi5YW3Nde76Iqp9rHTD
04cWiJX0tZDCrzksUuA2Ncq/454eqiKEO1weTw9l1n/mhbPYOgal87QPKucLXMZc
M2YdDQKmAUaKPoCWUPDd/KjsJnChS47qFoM4bmGQvOXQep1OPX4sPBW1JZnBX85u
Hx/GEXCDZfg2wLH9Pen3SDl7
-----END PRIVATE KEY-----

FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@flixpatrol-api.iam.gserviceaccount.com

FIREBASE_CLIENT_ID=102219606710930539417

FIREBASE_CLIENT_X509_CERT_URL=https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40flixpatrol-api.iam.gserviceaccount.com
```

⚠️ **IMPORTANTE:** 
- No `FIREBASE_PRIVATE_KEY`, cole TODO o conteúdo incluindo `-----BEGIN` e `-----END`
- As quebras de linha serão tratadas automaticamente pelo código

## 🔒 Revogar Credenciais Antigas

**FAÇA ISSO AGORA:**
1. Firebase Console → Project Settings → Service Accounts
2. Clique em "Generate new private key"
3. Use as NOVAS credenciais nas variáveis de ambiente acima
4. Delete ou desabilite a service account antiga

## 📝 Desenvolvimento Local

Crie arquivo `.env.local` (NÃO commitar!):

```env
FIREBASE_PROJECT_ID=flixpatrol-api
FIREBASE_PRIVATE_KEY_ID=...
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=...
FIREBASE_CLIENT_ID=...
FIREBASE_CLIENT_X509_CERT_URL=...
```

## ✅ Verificar

Após configurar, reinicie o serviço no Render. Você verá:
```
✅ Firebase inicializado com sucesso (usando env vars)
```
