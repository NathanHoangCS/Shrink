function renderThumbs() {
    thumbList.innerHTML = '';
    state.files.forEach((item, i) => {
      const div = document.createElement('div');
      div.className = 'thumb-item' + (i === state.activeIndex ? ' active' : '');
      const img = document.createElement('img');
      img.src = item.objectUrl;
      const rm = document.createElement('button');
      rm.className = 'thumb-remove';
      rm.innerHTML = '×';
      rm.addEventListener('click', e => { e.stopPropagation(); removeFile(i); });
  
      // spinner — shown while compressing, hidden when done
      const spinner = document.createElement('div');
      spinner.className = 'thumb-spinner';
      if (item.compressed) spinner.style.display = 'none';
  
      div.appendChild(img);
      div.appendChild(spinner);
      div.appendChild(rm);
      div.addEventListener('click', () => setActive(i));
      thumbList.appendChild(div);
    });
  }