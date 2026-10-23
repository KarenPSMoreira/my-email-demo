# My Email — demonstração didática para OpenShift

Projeto educacional com três componentes:
- `frontend/`: páginas HTML/CSS/JS servidas por Nginx.
- `backend/`: API Node.js + Express; valida login com bcrypt e emite JWT.
- MySQL: guarda usuário e hash da senha. A tabela é criada pelo backend.

O botão de enviar e-mail é apenas uma simulação: não envia e-mail real.

## Credenciais de demonstração
O backend cria o usuário definido por `DEMO_USER` e `DEMO_PASSWORD` na inicialização.
Exemplo para laboratório: usuário `demo`, senha `Demo123!`.
Use somente em ambiente de teste e não reutilize essa senha.

## Estrutura no GitHub
Envie a pasta inteira para um repositório GitHub público de demonstração. Não inclua senhas reais.
Os segredos são criados diretamente no OpenShift, não armazenados no repositório.

## Implantação sugerida
1. No OpenShift, crie um projeto, por exemplo `my-email`.
2. Na perspectiva Developer, use **+Add > Import from Git** duas vezes:
   - URL do repositório; Context Dir `backend`; estratégia Dockerfile; nome da aplicação `backend`.
   - URL do repositório; Context Dir `frontend`; estratégia Dockerfile; nome da aplicação `frontend`.
   Confirme que foram criados os Deployments e Services `backend` e `frontend`.
3. Crie o Secret do MySQL e o do backend usando os comandos abaixo. Troque os valores para seu laboratório:

```bash
oc create secret generic mysql-secret \
  --from-literal=MYSQL_ROOT_PASSWORD='TroqueEstaSenhaRoot123!' \
  --from-literal=MYSQL_DATABASE='myemail' \
  --from-literal=MYSQL_USER='appuser' \
  --from-literal=MYSQL_PASSWORD='TroqueEstaSenhaApp123!'

oc create secret generic backend-secret \
  --from-literal=DB_NAME='myemail' \
  --from-literal=DB_USER='appuser' \
  --from-literal=DB_PASSWORD='TroqueEstaSenhaApp123!' \
  --from-literal=JWT_SECRET='TroquePorUmSegredoLongoAleatorio' \
  --from-literal=DEMO_USER='demo' \
  --from-literal=DEMO_PASSWORD='Demo123!'
```

4. Aplique o manifesto do MySQL:

```bash
oc apply -f deploy/mysql.yaml
```

5. Configure o Deployment do backend para usar o Secret e os dados do banco:

```bash
oc set env deployment/backend --from=secret/backend-secret
oc set env deployment/backend DB_HOST=mysql DB_PORT=3306
```

6. Confirme que o backend tem as variáveis necessárias e aguarde os Pods:

```bash
oc get pods
oc logs deployment/backend
```

7. Crie uma Route para o frontend:

```bash
oc expose service/frontend
oc get route frontend
```

Abra o endereço `https://...` retornado pela Route. Use `demo` / `Demo123!`.

## Como isso se conecta
O navegador abre a Route do frontend. O Nginx serve os arquivos estáticos e encaminha `/api/` para o Service `backend`. O backend usa o nome DNS interno `mysql` para conectar ao Service do MySQL na porta 3306.

## Sobre `my-email.com`
A Route gerada pelo OpenShift terá normalmente um domínio do cluster. Para usar exatamente `my-email.com`, você precisa controlar o domínio e configurar DNS para apontar para o router do cluster; depois crie a Route com esse hostname, se a política do cluster permitir:

```bash
oc expose service/frontend --hostname=my-email.com
```

Não tente usar o domínio real sem autorização/controle do DNS. Para uma apresentação, use primeiro a Route gerada pelo OpenShift.

## Limitações e segurança
- Demonstração educacional, não é um serviço de e-mail real.
- A senha não é armazenada em texto puro: o banco guarda um hash bcrypt.
- Não use credenciais de demonstração em produção.
- Para produção, revise TLS, política de rede, rotação de segredos, backups do banco, autenticação, autorização, logs e gestão de sessão.
- O PVC usa uma classe de armazenamento padrão do cluster. Se não existir uma classe padrão, especifique `storageClassName` conforme seu ambiente.
