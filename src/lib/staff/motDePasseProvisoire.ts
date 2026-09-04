// Mots de passe provisoires générés côté serveur quand un admin crée un
// compte pour quelqu'un d'autre — jamais choisis par l'admin lui-même,
// pour ne jamais faire transiter un secret réutilisable par une tierce
// personne. Le compte est marqué `must_change_password` et devra en
// définir un nouveau à sa première connexion (voir proxy.ts et
// src/app/admin/definir-mot-de-passe).
//
// Alphabet sans caractères ambigus à l'oral/à l'écrit (pas de 0/O, 1/l/I) :
// ce mot de passe est fait pour être lu à voix haute ou recopié à la main.
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";

export function genererMotDePasseProvisoire(longueur = 12): string {
  const octets = new Uint8Array(longueur);
  crypto.getRandomValues(octets);
  return Array.from(octets, (o) => ALPHABET[o % ALPHABET.length]).join("");
}
