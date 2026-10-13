#!/usr/bin/env bash
# Installation / mise à jour de STL Catalog sur un Raspberry Pi (ou tout Linux Debian/Ubuntu 64 bits).
#
#   ./install.sh
#
# - installe Docker s'il est absent (dépôt apt officiel de Docker) ;
# - crée .env avec des secrets aléatoires au premier lancement (jamais écrasés ensuite) ;
# - construit et démarre la stack ; elle redémarre seule après un reboot ou un plantage.
# Relancer le script après un `git pull` met l'application à jour.

set -euo pipefail

cd "$(dirname "$(readlink -f "$0")")"

bold=$'\e[1m'; green=$'\e[32m'; yellow=$'\e[33m'; red=$'\e[31m'; reset=$'\e[0m'
step() { echo; echo "${bold}==> $*${reset}"; }
ok()   { echo "${green}✔${reset} $*"; }
warn() { echo "${yellow}⚠${reset} $*"; }
die()  { echo "${red}✘ $*${reset}" >&2; exit 1; }

# root n'a pas besoin de sudo ; les autres oui (installation de Docker, docker si hors du groupe).
if [ "$(id -u)" -eq 0 ]; then SUDO=""; else
  command -v sudo >/dev/null || die "sudo est nécessaire (ou lancer le script en root)"
  SUDO="sudo"
fi

# ---------------------------------------------------------------------------
step "Vérification du système"

if [ ! -f .env.example ] || [ ! -f docker-compose.yml ]; then die "Lancer le script depuis le dossier du projet"; fi

arch_kernel=$(uname -m)
arch_userland=$(dpkg --print-architecture 2>/dev/null || echo "$arch_kernel")
case "$arch_userland" in
  arm64|aarch64|amd64|x86_64) ok "Architecture $arch_userland" ;;
  armhf|armel|armv7l|armv6l)
    die "Système 32 bits ($arch_userland, noyau $arch_kernel) : MariaDB et Node n'existent qu'en 64 bits.
   Réinstaller Raspberry Pi OS en version 64 bits (Raspberry Pi Imager → « Raspberry Pi OS (64-bit) »)." ;;
  *) die "Architecture non supportée : $arch_userland" ;;
esac

mem_mb=$(awk '/MemTotal/ {print int($2/1024)}' /proc/meminfo)
if [ "$mem_mb" -lt 1800 ]; then
  warn "${mem_mb} Mo de RAM : la construction du frontend peut échouer faute de mémoire (2 Go conseillés)."
  warn "En cas d'échec, augmenter le swap : sudo dphys-swapfile swapoff && sudo sed -i 's/^CONF_SWAPSIZE=.*/CONF_SWAPSIZE=2048/' /etc/dphys-swapfile && sudo dphys-swapfile setup && sudo dphys-swapfile swapon"
else
  ok "${mem_mb} Mo de RAM"
fi

# ---------------------------------------------------------------------------
step "Docker"

if command -v docker >/dev/null; then
  ok "Docker déjà installé : $(docker --version)"
else
  # Même méthode que le rôle Ansible raspberry_pi_configurator (install_docker.yml) : dépôt apt
  # officiel de Docker, avec la clé dans /etc/apt/keyrings (signed-by) plutôt qu'apt-key, obsolète.
  # Raspberry Pi OS 64 bits est une Debian arm64 : dépôt linux/debian (linux/ubuntu sous Ubuntu).
  # shellcheck disable=SC1091
  . /etc/os-release
  case "${ID:-}" in
    debian|raspbian) docker_distro=debian ;;
    ubuntu) docker_distro=ubuntu ;;
    *) die "Distribution « ${ID:-inconnue} » non gérée : installer Docker à la main (https://docs.docker.com/engine/install/) puis relancer." ;;
  esac
  codename=${VERSION_CODENAME:-}
  [ -n "$codename" ] || die "Version de la distribution introuvable (VERSION_CODENAME dans /etc/os-release)"
  echo "Docker absent : installation depuis le dépôt officiel ($docker_distro $codename, $arch_userland)…"

  $SUDO apt-get update -qq
  $SUDO apt-get install -y -qq ca-certificates curl
  $SUDO install -m 0755 -d /etc/apt/keyrings
  $SUDO curl -fsSL "https://download.docker.com/linux/$docker_distro/gpg" -o /etc/apt/keyrings/docker.asc
  $SUDO chmod a+r /etc/apt/keyrings/docker.asc
  echo "deb [arch=$arch_userland signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/$docker_distro $codename stable" \
    | $SUDO tee /etc/apt/sources.list.d/docker.list >/dev/null
  $SUDO apt-get update -qq
  $SUDO apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  ok "Docker installé : $(docker --version)"
fi

# Démarrage automatique au boot : c'est ce qui rend l'application permanente.
$SUDO systemctl enable --now docker >/dev/null 2>&1 || warn "Impossible d'activer le service docker au démarrage"

# Utiliser docker sans sudo si l'utilisateur est déjà dans le groupe docker.
if docker info >/dev/null 2>&1; then DOCKER="docker"; else DOCKER="$SUDO docker"; fi
if [ -n "$SUDO" ] && ! id -nG "$USER" | grep -qw docker; then
  $SUDO usermod -aG docker "$USER" && ok "$USER ajouté au groupe docker (effectif à la prochaine connexion)"
fi

$DOCKER compose version >/dev/null 2>&1 || die "Plugin « docker compose » introuvable (paquet docker-compose-plugin)"
ok "$($DOCKER compose version)"

# ---------------------------------------------------------------------------
step "Configuration (.env)"

random_secret() {
  if command -v openssl >/dev/null; then openssl rand -hex "$1"
  else head -c "$1" /dev/urandom | od -An -tx1 | tr -d ' \n'; fi
}

if [ -f .env ]; then
  ok ".env existant conservé"
else
  cp .env.example .env
  chmod 600 .env
  ok ".env créé depuis .env.example"
fi

# Remplit uniquement les secrets vides : ne jamais changer un mot de passe DB déjà utilisé par la base.
for var in DB_ROOT_PASSWORD:24 DB_PASSWORD:24 JWT_SECRET:32; do
  name=${var%%:*}; bytes=${var##*:}
  if grep -qE "^${name}=$" .env; then
    sed -i "s/^${name}=$/${name}=$(random_secret "$bytes")/" .env
    ok "$name généré"
  elif ! grep -qE "^${name}=" .env; then
    echo "${name}=$(random_secret "$bytes")" >> .env
    ok "$name généré"
  fi
done

port=$(grep -E '^FRONTEND_PORT=' .env | cut -d= -f2)
port=${port:-8090}
models_dir=$(grep -E '^MODELS_DIR=' .env | cut -d= -f2)
models_dir=${models_dir:-./modeles}
mkdir -p "$models_dir"

# Port déjà pris par autre chose que notre frontend ?
if ss -ltnH "sport = :$port" 2>/dev/null | grep -q . && ! $DOCKER compose ps --services --status running 2>/dev/null | grep -qx frontend; then
  die "Le port $port est déjà utilisé sur cette machine. Choisir un autre FRONTEND_PORT dans .env puis relancer."
fi

# ---------------------------------------------------------------------------
step "Construction et démarrage (premier lancement : plusieurs minutes sur un Pi)"

$DOCKER compose up -d --build --remove-orphans

echo -n "Attente du démarrage de l'application"
for _ in $(seq 1 90); do
  if curl -fs "http://localhost:$port/api/health" >/dev/null 2>&1; then echo; ok "Application démarrée"; break; fi
  echo -n "."; sleep 2
done
curl -fs "http://localhost:$port/api/health" >/dev/null 2>&1 || {
  echo; die "L'application ne répond pas. Voir les logs : $DOCKER compose logs --tail 50"
}

# ---------------------------------------------------------------------------
ip=$(hostname -I 2>/dev/null | awk '{print $1}')
url="http://${ip:-localhost}:$port"
setup=$(curl -fs "http://localhost:$port/api/auth/setup" || echo '{}')

echo
echo "${green}${bold}STL Catalog est installé : $url${reset}"
echo
if echo "$setup" | grep -q '"required":true'; then
  echo "${yellow}${bold}Premier lancement : ouvrez $url et choisissez le mot de passe administrateur.${reset}"
  echo "${yellow}(La première personne qui ouvre le site le choisit : faites-le tout de suite.)${reset}"
  echo
fi
echo "Déposez vos modèles dans $(readlink -f "$models_dir")/<catégorie>/ (dossiers ou archives zip/rar/7z)."
echo "Ils apparaissent après le scan automatique (10 min) ou via Administration → Rescanner."
echo
echo "L'application redémarre toute seule (reboot, plantage). Commandes utiles :"
echo "  $DOCKER compose logs -f        # journaux"
echo "  $DOCKER compose down           # arrêter"
echo "  git pull && ./install.sh       # mettre à jour"
