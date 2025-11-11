
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { GoogleGenAI } from "@google/genai";

const root = document.getElementById('root');

if (root) {
  const main = document.createElement('main');
  
  const title = document.createElement('h1');
  title.textContent = 'Grupna obrada natječaja';
  
  const description = document.createElement('p');
  description.textContent = 'Grupna obrada natječaja';
  
  main.appendChild(title);
  main.appendChild(description);

  const uploadContainer = document.createElement('div');
  uploadContainer.className = 'upload-container';

  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.id = 'pdf-upload';
  fileInput.accept = '.pdf,.txt,.docx';
  fileInput.multiple = true;
  fileInput.setAttribute('aria-hidden', 'true');
  fileInput.style.display = 'none';

  const uploadLabel = document.createElement('label');
  uploadLabel.htmlFor = 'pdf-upload';
  uploadLabel.className = 'upload-label';
  uploadLabel.textContent = 'Odaberite datoteke (PDF, TXT, DOCX)';
  uploadLabel.setAttribute('role', 'button');
  uploadLabel.setAttribute('tabindex', '0');

  const fileListContainer = document.createElement('div');
  fileListContainer.id = 'file-list';
  fileListContainer.className = 'file-list';
  fileListContainer.setAttribute('aria-live', 'polite');
  
  const summaryOptionsContainer = document.createElement('div');
  summaryOptionsContainer.className = 'summary-options-container';

  const summaryLabel = document.createElement('label');
  summaryLabel.htmlFor = 'summary-detail';
  summaryLabel.className = 'summary-label';
  summaryLabel.textContent = 'Razina detalja sažetka:';

  const summarySelect = document.createElement('select');
  summarySelect.id = 'summary-detail';
  summarySelect.className = 'summary-select';

  const options = [
    { value: 'kratak', text: 'Kratak' },
    { value: 'srednji', text: 'Srednji' },
    { value: 'detaljan', text: 'Detaljan' }
  ];

  options.forEach(opt => {
    const option = document.createElement('option');
    option.value = opt.value;
    option.textContent = opt.text;
    if (opt.value === 'srednji') {
      option.selected = true;
    }
    summarySelect.appendChild(option);
  });
  
  summaryOptionsContainer.appendChild(summaryLabel);
  summaryOptionsContainer.appendChild(summarySelect);

  const processButton = document.createElement('button');
  processButton.className = 'process-button';
  processButton.textContent = 'Obradi datoteke';
  processButton.disabled = true;

  const loader = document.createElement('div');
  loader.className = 'loader';
  loader.style.display = 'none';

  uploadContainer.appendChild(fileInput);
  uploadContainer.appendChild(uploadLabel);
  uploadContainer.appendChild(fileListContainer);
  uploadContainer.appendChild(summaryOptionsContainer);
  uploadContainer.appendChild(processButton);
  uploadContainer.appendChild(loader);
  
  const resultsContainer = document.createElement('div');
  resultsContainer.className = 'results-container';
  
  main.appendChild(uploadContainer);
  main.appendChild(resultsContainer);
  
  root.appendChild(main);

  const processFiles = async () => {
    if (!fileInput.files || fileInput.files.length === 0) {
      return;
    }

    loader.style.display = 'block';
    processButton.disabled = true;
    uploadLabel.style.pointerEvents = 'none';
    uploadLabel.style.opacity = '0.6';
    resultsContainer.innerHTML = '';
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
      const model = 'gemini-2.5-flash';
      const files = Array.from(fileInput.files);
      
      const detailLevel = summarySelect.value;
      let promptText;
      const basePrompt = "Odgovori na hrvatskom jeziku. ";
      switch(detailLevel) {
        case 'kratak':
          promptText = basePrompt + "Analiziraj i pruži kratak sažetak u jednom odlomku za sljedeći dokument vezan uz natječajnu prijavu:";
          break;
        case 'detaljan':
          promptText = basePrompt + "Analiziraj i pruži detaljan sažetak u više odlomaka, ističući ključne točke, zahtjeve i rokove iz sljedećeg dokumenta vezanog uz natječajnu prijavu:";
          break;
        case 'srednji':
        default:
          promptText = basePrompt + "Analiziraj i pruži sažet sažetak sljedećeg dokumenta vezanog uz natječajnu prijavu:";
          break;
      }

      for (const file of files) {
        const resultItem = document.createElement('div');
        resultItem.className = 'result-item';

        const resultTitle = document.createElement('h3');
        resultTitle.textContent = file.name;

        const resultText = document.createElement('p');
        resultText.textContent = 'Obrađuje se...';

        resultItem.appendChild(resultTitle);
        resultItem.appendChild(resultText);
        resultsContainer.appendChild(resultItem);

        try {
          let contentPart;

          if (file.type === 'text/plain') {
            const text = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.onerror = (err) => reject(err);
              reader.readAsText(file);
            });
            contentPart = { text: text };
          } else {
            const base64EncodedData = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
              reader.onerror = (err) => reject(err);
              reader.readAsDataURL(file);
            });
            contentPart = {
              inlineData: {
                data: base64EncodedData,
                mimeType: file.type
              }
            };
          }

          const response = await ai.models.generateContent({
            model: model,
            contents: {
              parts: [
                { text: promptText },
                contentPart
              ]
            }
          });
          
          const summary = response.text;
          resultText.textContent = summary;

          const downloadButton = document.createElement('button');
          downloadButton.className = 'download-button';
          downloadButton.textContent = 'Preuzmi sažetak';
          downloadButton.onclick = () => {
            const blob = new Blob([summary], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `sazetak-${file.name}.txt`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
          };
          resultItem.appendChild(downloadButton);

        } catch (error) {
           resultText.textContent = 'Greška pri obradi ove datoteke.';
           console.error(`Error processing ${file.name}:`, error);
        }
      }

    } catch (error) {
      console.error('Error during file processing:', error);
      const errorItem = document.createElement('div');
      errorItem.className = 'result-item error';
      errorItem.textContent = 'Došlo je do neočekivane greške prilikom obrade datoteka. Molimo pokušajte ponovo.';
      resultsContainer.appendChild(errorItem);
    } finally {
      loader.style.display = 'none';
      processButton.disabled = false;
      uploadLabel.style.pointerEvents = 'auto';
      uploadLabel.style.opacity = '1';
    }
  };

  const handleFileSelection = () => {
    fileListContainer.innerHTML = '';
    resultsContainer.innerHTML = '';
    if (fileInput.files && fileInput.files.length > 0) {
      const list = document.createElement('ul');
      const files = Array.from(fileInput.files);
      files.forEach(file => {
        const listItem = document.createElement('li');
        
        const icon = document.createElement('span');
        icon.className = 'file-icon';
        const fileType = file.name.split('.').pop()?.toLowerCase();
        
        switch (fileType) {
          case 'pdf':
            icon.textContent = '📄';
            icon.setAttribute('aria-label', 'PDF datoteka');
            break;
          case 'docx':
            icon.textContent = '📝';
            icon.setAttribute('aria-label', 'DOCX datoteka');
            break;
          case 'txt':
            icon.textContent = '🗒️';
            icon.setAttribute('aria-label', 'TXT datoteka');
            break;
          default:
            icon.textContent = '📁';
            icon.setAttribute('aria-label', 'Datoteka');
            break;
        }
        
        const fileName = document.createElement('span');
        fileName.className = 'file-name';
        fileName.textContent = file.name;
  
        listItem.appendChild(icon);
        listItem.appendChild(fileName);
        list.appendChild(listItem);
      });
      fileListContainer.appendChild(list);
      processButton.disabled = false;
    } else {
      processButton.disabled = true;
    }
  };

  fileInput.addEventListener('change', handleFileSelection);
  processButton.addEventListener('click', processFiles);

  uploadLabel.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      fileInput.click();
    }
  });

  uploadContainer.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
    uploadContainer.classList.add('drag-over');
  });

  uploadContainer.addEventListener('dragleave', (e) => {
    e.preventDefault();
    e.stopPropagation();
    uploadContainer.classList.remove('drag-over');
  });

  uploadContainer.addEventListener('drop', (e) => {
    e.preventDefault();
    e.stopPropagation();
    uploadContainer.classList.remove('drag-over');
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      fileInput.files = files;
      handleFileSelection();
    }
  });
}
