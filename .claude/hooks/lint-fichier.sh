#!/bin/bash
# PostToolUse : passe ESLint sur le fichier que Claude vient d'éditer.
# Sortie 2 = l'erreur est renvoyée à Claude pour qu'il corrige immédiatement.

entree=$(cat)
fichier=$(printf '%s' "$entree" | node -e "
let d='';
process.stdin.on('data', c => d += c).on('end', () => {
  try { console.log(JSON.parse(d).tool_input?.file_path || ''); } catch { console.log(''); }
});
")

case "$fichier" in
  *.ts|*.tsx) ;;
  *) exit 0 ;;
esac

[ -f "$fichier" ] || exit 0
cd "$CLAUDE_PROJECT_DIR" 2>/dev/null || exit 0

if ! sortie=$(npx --no-install eslint "$fichier" 2>&1); then
  echo "ESLint signale des erreurs dans $fichier :" >&2
  echo "$sortie" >&2
  exit 2
fi
exit 0
