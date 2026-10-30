# Envoyer les e-mails par Make (Gmail)

Solution de dépannage tant que le domaine n'est pas vérifié chez Resend. L'application garde toute
la logique (qui, quand, quel texte, journal des rappels) ; Make ne fait que **poster le mail depuis
Gmail**.

## 1. Scénario Make

Crée un scénario avec trois modules, dans cet ordre :

1. **Webhooks → Custom webhook** : copie l'URL générée. Choisis une zone UE à la création du compte
   (les e-mails des joueurs transitent par Make).
2. **Gmail → Send an email** :
   - *To* : `destinataire`
   - *Subject* : `sujet`
   - *Content* : `texte` (type *Plain text*)
   - *Attachments* (si utilisé) : tableau `pieces_jointes` ; pour chaque pièce, le nom (`nom`) et le
     contenu téléchargé depuis `url` par un module **HTTP → Get a file** placé avant Gmail, avec un
     *Iterator* sur `pieces_jointes`.
3. **Webhooks → Webhook response** (obligatoire) : statut `200`, en-tête `Content-Type:
   application/json`, corps `{"ok": true}`.
   - Ajoute sur le module Gmail un *error handler* de type **Webhook response** : statut `200`,
     corps `{"ok": false, "error": "{{error.message}}"}`.
   - Sans ce module, Make répond « Accepted » avant l'envoi et un refus de Gmail n'est pas vu par l'app.

**Filtre de sécurité** entre le webhook et Gmail : l'en-tête `x-padelmeet-secret` doit être égal à la
valeur de `MAKE_WEBHOOK_SECRET` (sinon n'importe qui connaissant l'URL pourrait envoyer des mails
depuis ton Gmail).

## 2. Données envoyées par l'application

```json
{
  "destinataire": "joueur@exemple.fr",
  "sujet": "Rappel — ton match à 14:00",
  "texte": "…",
  "pieces_jointes": [{ "nom": "poules.pdf", "url": "https://…" }]
}
```

`pieces_jointes` est toujours présent (liste vide si aucune). L'application n'en joint aucune
aujourd'hui : le champ est prêt pour quand un document sera proposé en téléchargement public.

## 3. Variables d'environnement (Vercel)

| Variable | Valeur |
|---|---|
| `EMAIL_FOURNISSEUR` | `make` (absent ou autre valeur = Resend) |
| `MAKE_WEBHOOK_URL` | l'URL du webhook du module 1 |
| `MAKE_WEBHOOK_SECRET` | une longue chaîne aléatoire, la même que dans le filtre Make |

Redéploie après avoir ajouté les variables. Pour revenir à Resend : supprime `EMAIL_FOURNISSEUR`
(ou mets `resend`) et redéploie.

## 4. Limites à connaître

- Gmail personnel : environ 500 destinataires par jour ; les mails partent de ton adresse.
- Chaque e-mail consomme au moins 3 opérations Make (webhook, Gmail, réponse) : vérifie ton quota.
- L'application attend la réponse du scénario (25 s maximum). Un scénario désactivé ou lent est
  signalé comme un échec d'envoi, jamais comme un envoi réussi.
- Les notifications aux administrateurs et les rappels passent tous deux par ce canal.
