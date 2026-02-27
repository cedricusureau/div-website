# Déploiement TCR-Touch

## Connexion au serveur

```bash
ssh -o 'HostKeyAlgorithms +ssh-rsa' -J usureauc@sshgw-adm.centralesupelec.fr usureauc@docker-heb01.centralesupelec.fr
```

## Cycle de mise à jour (Git + Docker)

### 1. Aller dans le projet

```bash
cd /srv/tcrtouch/div-website/visualisation-hla
```

### 2. Récupérer la dernière version du code

```bash
git pull
```

### 3. Rebuild l'image Docker

```bash
sudo docker compose build
```

### 4. Redémarrer le container avec la nouvelle image

```bash
sudo docker compose up -d
```

### 5. Vérifier que le container est bien reparti

```bash
sudo docker ps
```

### 6. (Optionnel) Regarder les logs en direct

```bash
sudo docker logs -f visualisation_hla_web
```

## Résumé rapide

À chaque modification pushée sur GitHub :

```bash
git pull
sudo docker compose build
sudo docker compose up -d
```
