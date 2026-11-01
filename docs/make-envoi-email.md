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
   - *Attachments* : voir « Pièce jointe » ci-dessous.
3. **Webhooks → Webhook response** (obligatoire) : statut `200`, en-tête `Content-Type:
   application/json`, corps `{"ok": true}`.
   - Ajoute sur le module Gmail un *error handler* de type **Webhook response** : statut `200`,
     corps `{"ok": false, "error": "{{error.message}}"}`.
   - Sans ce module, Make répond « Accepted » avant l'envoi et un refus de Gmail n'est pas vu par l'app.

**Filtre de sécurité** entre le webhook et Gmail : le champ `secret` du corps JSON (repris aussi dans
l'en-tête `x-padelmeet-secret`) doit être égal à la valeur de `MAKE_WEBHOOK_SECRET` (sinon n'importe qui
connaissant l'URL pourrait envoyer des mails depuis ton Gmail). Dans le filtre, choisis la pastille
`1. secret` du webhook (elle apparaît après un envoi réel ou « Redetermine data structure »), opérateur
« Text operators: Equal to », valeur du secret sans guillemets ni espace. Préfère ce champ à l'en-tête :
Make présente les en-têtes comme une liste (`Headers[]` avec `Name` et `Value`), peu pratique à filtrer.

### Pièce jointe

L'application joint le planning PDF sous forme de texte base64 dans `pieces_jointes` (aucune adresse
publique n'est nécessaire). Dans Make, fais deux branches avec un **Router** après le filtre de
sécurité :

- **Branche avec pièce jointe** (filtre : `length(pieces_jointes)` supérieur à 0) : module Gmail
  avec une pièce jointe dont le *File name* est `first(pieces_jointes).nom` et le *Data* est
  `toBinary(first(pieces_jointes).contenu_base64; base64)`.
- **Branche sans pièce jointe** : module Gmail sans pièce jointe.

Chacune se termine par ses modules *Webhook response* (succès et erreur) comme ci-dessus. Pour que
Make reconnaisse la structure de `pieces_jointes`, envoie d'abord un essai **avec** planning depuis
l'onglet Messages, puis relance « Re-determine data structure » sur le webhook. La taille d'une
requête vers un webhook Make est limitée (quelques Mo) : un planning fait quelques dizaines de ko.
Une pièce peut aussi arriver avec `url` au lieu de `contenu_base64` (document hébergé) : dans ce cas,
télécharge-la avec **HTTP → Get a file** avant Gmail.

## 2. Données envoyées par l'application

```json
{
  "secret": "valeur de MAKE_WEBHOOK_SECRET",
  "destinataire": "joueur@exemple.fr",
  "sujet": "Rappel — ton match à 14:00",
  "texte": "…",
  "pieces_jointes": [{ "nom": "planning-open-de-lyon.pdf", "contenu_base64": "JVBERi0xLjcK…" }]
}
```

`pieces_jointes` est toujours présent (liste vide si aucune). Depuis l'onglet **Messages** d'un
tournoi, le planning PDF est joint en `contenu_base64`.

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
- L'application attend la réponse du scénario (25 s maximum). Un scénario désactivé (Make répond « Accepted » et met
  le message en file d'attente), lent, ou dont la branche suivie n'atteint aucun module *Webhook response*
  (Make répond aussi « Accepted ») est signalé comme un échec d'envoi, jamais comme un envoi confirmé. Dans
  ce dernier cas le mail peut être parti : **chaque branche du scénario doit finir par un Webhook response**
  `{"ok": true}`, y compris après un Router.
- **Le scénario doit être activé** (interrupteur « ON » en bas à gauche de l'éditeur, planification « Immediately
  as data arrives »). Un scénario sur « Inactive » ne traite rien : les appels s'empilent dans « Show queue ».
- Les notifications aux administrateurs et les rappels passent tous deux par ce canal.
