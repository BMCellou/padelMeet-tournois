// Détecte les fiches joueur "fantômes" (sans compte, user_id null) en
// doublon : même email + nom + prénom (comparaison insensible à la
// casse), qui devraient être une seule et même personne. Lecture seule —
// ne modifie rien. Voir aussi fusionner-doublons-fantomes.mjs.
//
// Utilise directement l'API REST (PostgREST) plutôt que @supabase/supabase-js
// pour éviter sa dépendance au WebSocket natif (absent en Node 20).
//
// Usage : node --env-file=.env.local scripts/detecter-doublons-fantomes.mjs

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function rest(path) {
  const res = await fetch(`${url}/rest/v1/${path}`, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      Prefer: "count=exact",
    },
  });
  if (!res.ok) throw new Error(`${path} -> ${res.status} ${await res.text()}`);
  const total = res.headers.get("content-range")?.split("/")[1];
  return { data: await res.json(), total: total ? Number(total) : undefined };
}

const { data: fantomes } = await rest(
  "players?select=id,nom,prenom,email&user_id=is.null&email=not.is.null",
);

const groupes = new Map();
for (const joueur of fantomes) {
  const cle = `${joueur.email.trim().toLowerCase()}|${joueur.nom.trim().toLowerCase()}|${joueur.prenom.trim().toLowerCase()}`;
  if (!groupes.has(cle)) groupes.set(cle, []);
  groupes.get(cle).push(joueur);
}

const doublons = [...groupes.values()].filter((g) => g.length > 1);

if (doublons.length === 0) {
  console.log(`Aucun doublon trouvé (${fantomes.length} fiches fantômes examinées).`);
  process.exit(0);
}

console.log(`${doublons.length} groupe(s) de doublons trouvé(s) :\n`);
for (const groupe of doublons) {
  console.log(`- ${groupe[0].prenom} ${groupe[0].nom} <${groupe[0].email}>`);
  for (const joueur of groupe) {
    const { total: nbEquipes } = await rest(`team_players?select=team_id&player_id=eq.${joueur.id}`);
    const { total: nbInscriptions } = await rest(
      `registrations?select=id&player_id=eq.${joueur.id}`,
    );
    console.log(
      `    id=${joueur.id}  team_players=${nbEquipes ?? 0}  registrations.player_id=${nbInscriptions ?? 0}`,
    );
  }
}
