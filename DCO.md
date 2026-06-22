# Developer Certificate of Origin (DCO)

O Medusa Clip usa o **Developer Certificate of Origin** em vez de um CLA. Em vez de
assinar um contrato, você adiciona uma linha `Signed-off-by` a cada commit — isso
**certifica** que você tem o direito de contribuir com aquele código sob a licença do
projeto (**AGPL-3.0**).

## Como assinar (sign-off)

Em cada commit, use a flag `-s`:

```bash
git commit -s -m "sua mensagem"
```

Isso adiciona automaticamente ao final da mensagem:

```
Signed-off-by: Seu Nome <seu-email@exemplo.com>
```

O nome e e-mail precisam bater com os do autor do commit
(`git config user.name` / `git config user.email`).

### Esqueceu de assinar?

```bash
# ultimo commit:
git commit --amend -s --no-edit

# varios commits do seu PR (a partir da base):
git rebase --signoff origin/master
git push --force-with-lease
```

Um workflow de CI (`.github/workflows/dco.yml`) verifica o sign-off em todo PR.

## O texto do certificado

Ao assinar, você concorda com o texto abaixo (versão 1.1, de
<https://developercertificate.org/>):

```
Developer Certificate of Origin
Version 1.1

Copyright (C) 2004, 2006 The Linux Foundation and its contributors.

Everyone is permitted to copy and distribute verbatim copies of this
license document, but changing it is not allowed.


Developer's Certificate of Origin 1.1

By making a contribution to this project, I certify that:

(a) The contribution was created in whole or in part by me and I
    have the right to submit it under the open source license
    indicated in the file; or

(b) The contribution is based upon previous work that, to the best
    of my knowledge, is covered under an appropriate open source
    license and I have the right under that license to submit that
    work with modifications, whether created in whole or in part
    by me, under the same open source license (unless I am
    permitted to submit under a different license), as indicated
    in the file; or

(c) The contribution was provided directly to me by some other
    person who certified (a), (b) or (c) and I have not modified
    it.

(d) I understand and agree that this project and the contribution
    are public and that a record of the contribution (including all
    personal information I submit with it, including my sign-off) is
    maintained indefinitely and may be redistributed consistent with
    this project or the open source license(s) involved.
```
