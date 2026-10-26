# Marca e imagens do Joga Placa

A logomarca original foi copiada do repositório legado para `public/images/brand/joga-placa-logo.jpg`.

As imagens-base das placas ficam em `public/images/plates/`:
- `placa-mercosul.svg`
- `placa-cinza.svg`

O componente `src/components/plates/plate-visual.tsx` usa as duas imagens e posiciona os caracteres em uma camada separada. A posição precisa ser conferida visualmente em diferentes tamanhos de tela antes da publicação.

## Ícone do aplicativo

Os metadados e o manifesto usam atualmente a imagem local da logomarca, para que o projeto não dependa de arquivos hospedados no repositório antigo. O ícone original do aplicativo ainda não foi copiado, porque a ferramenta de transferência não conseguiu recuperar seus bytes completos. Quando ele estiver disponível como arquivo local, deve ser colocado em `public/images/brand/` e configurado nos metadados e no manifesto.
