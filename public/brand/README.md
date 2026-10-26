# Marca e imagens do Joga Placa

A logomarca original foi copiada do repositório legado para `public/images/brand/joga-placa-logo.jpg`.

As imagens-base das placas ficam em `public/images/plates/`:
- `placa-mercosul.svg`
- `placa-cinza.svg`

O componente `src/components/plates/plate-visual.tsx` usa as duas imagens e posiciona os caracteres em uma camada separada. A posição precisa ser conferida visualmente em diferentes tamanhos de tela antes da publicação.

O ícone de aplicativo configurado no manifesto e nos metadados aponta para o arquivo original do repositório legado:
`https://raw.githubusercontent.com/jpveiculos/Joga-Placa/main/public/images/brand/joga-placa-app-icon.PNG`

Antes de publicar, é recomendável copiar esse ícone para `public/images/brand/` e atualizar os caminhos para que os recursos de identidade visual sejam servidos pelo próprio site.
