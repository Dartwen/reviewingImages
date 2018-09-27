'use strict';

const api = 'https://neto-api.herokuapp.com';

const wrapCanvas = document.createElement('div');
const canvas = document.createElement('canvas');

let connection;
let dataGet;
let showComments = {};
let selectedColor;
let host;

const selectedImage = document.querySelector('.current-image');
const loader = document.querySelector('.image-loader');
const appWrap = document.querySelector('.app');
const downloadNew = document.querySelector('.new');
const menuToggleTittleOn = document.querySelector('.menu__toggle-title_on');
const commentsOn = document.querySelector('#comments-on');
const menuToggleTittleOff = document.querySelector('.menu__toggle-title_off');
const commentsOff = document.querySelector('#comments-off');
const copyMenu = document.querySelector('.menu_copy');
const colorMenu = document.querySelectorAll('.menu__color');
const urlMenu = document.querySelector('.menu__url');

let movingBurger = null;
let minY, minX, maxX, maxY;
let shiftX = 0;
let shiftY = 0;

// Перемещение бургера
function dragBurger(event) {
    if (!event.target.classList.contains('drag')) {
        return;
    }
    movingBurger = event.target.parentElement;
    minX = appWrap.offsetLeft;
    minY = appWrap.offsetTop;
    maxX = appWrap.offsetLeft + appWrap.offsetWidth - movingBurger.offsetWidth;
    maxY = appWrap.offsetTop + appWrap.offsetHeight - movingBurger.offsetHeight;
    shiftX = event.pageX - event.target.getBoundingClientRect().left - window.pageXOffset;
    shiftY = event.pageY - event.target.getBoundingClientRect().top - window.pageYOffset;
}

// Перемещаем (drag) бургер
function drag(event) {
    if (!movingBurger) {
        return;
    }
    let x = event.pageX - shiftX;
    let y = event.pageY - shiftY;
    x = Math.min(x, maxX);
    y = Math.min(y, maxY);
    x = Math.max(x, minX);
    y = Math.max(y, minY);
    movingBurger.style.left = x + 'px';
    movingBurger.style.top = y + 'px';
}

// Отпускаем (drop) бургер
function drop() {
    if (!movingBurger) {
        return;
    }
    movingBurger = null;
}

//накладываем ограничения на частоту запуска функции
function constrain(use, delay = 0) {
    let isWait = false;

    return function (...result) {
        if (!isWait) {
            use.apply(this, result);
            isWait = true;
            setTimeout(() => {
                isWait = false;
            }, delay);
        }
    }
}

document.addEventListener('mousedown', dragBurger);
document.addEventListener('mousemove', constrain(drag));
document.addEventListener('mouseup', drop);

// Создаём хранилище, где будут храниться элементы
function getFromTheStore() {
    switch (typeof(window['globalStorage'])) {
        case 'undefined':
            window.globalStorage = {};
            break;
    }
    return window.globalStorage;
}

// Сохраняем элемент в хранилище
function getTheItemInTheStore(argument) {
    let depository = getFromTheStore();
    depository[argument] = document.querySelector(`.${argument}`);
}

// Выгружаем переменную из хранилища
function unloadStorageItem(argument) {
    let depository = getFromTheStore();
    return depository[argument];
}

// Скрываем элементы
function hiddenElement(item) {
    item.style.display = 'none';
}

// Показываем элементы
function showElement(item) {
    item.style.display = '';
}

getTheItemInTheStore('menu');
getTheItemInTheStore('burger');
getTheItemInTheStore('error');

//Первый режим - режим Публикации
selectedImage.src = '';//без фона
//уюираем меню режима Публикации
unloadStorageItem('menu').dataset.state = 'initial';
appWrap.dataset.state = '';
//скрываем бургер
hiddenElement(unloadStorageItem('burger'));
//убираем комментарии в режиме публикации
appWrap.removeChild(document.querySelector('.comments__form'));
//выбор файла для загрузки
downloadNew.addEventListener('click', fileDownload);

//drag&drop
appWrap.addEventListener('drop', dragDropFile);
appWrap.addEventListener('dragover', event => event.preventDefault());

//Второй режим - режим Рецензирования
//показываем меню при клике на бургере
unloadStorageItem('burger').addEventListener('click', displayMenu);
//при клике на холсте создаем комментарии
canvas.addEventListener('click', createCommentForm);
//переключатели Показать комментарии
menuToggleTittleOn.addEventListener('click', checkboxOn);
commentsOn.addEventListener('click', checkboxOn);
// переключатели Скрыть комментарии
menuToggleTittleOff.addEventListener('click', checkboxOff);
commentsOff.addEventListener('click', checkboxOff);

//копируем ссылку по нажатию на копку Копировать в Поделиться
copyMenu.addEventListener('click', duplicate);

//находим id
let url = new URL(`${window.location.href}`);
let argumentId = url.searchParams.get('id');
findId(argumentId);

//Производим копирование ссылки при нажатии кнопки Копировать в Поделиться
function duplicate() {
    urlMenu.select();
    try {
        let safely = document.execCommand('copy');
        if (safely) {
            console.log(`URL скопирован`);
        } else {
            console.log(`URL не скопирован`);
        }
    }
    catch (e) {
        console.log('Произошла ошика при копировании');
    }
    window.getSelection().removeAllRanges();
}

//Убираем расширение файла
function removeFileExtension(text) {
    let regExp = new RegExp(/\.[^.]+$/gi);
    return text.replace(regExp, '');
}

//находим из временной метки дату и время
function giveTime(timemark) {
    const possibility = {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    };
    const date = new Date(timemark);
    const dateString = date.toLocaleString('ru-RU', possibility);
    return dateString.slice(0, 8) + dateString.slice(9);
}

//Убираем текст ошибки через 7 секунд
function unseenError() {
    setTimeout(function () {
        hiddenElement(unloadStorageItem('error'));
    }, 7000);
}

//после завершения события происходит отложенный пуск функции
function clean(use, delay = 0) {
    let interval;

    return () => {
        clearTimeout(interval);
        interval = setTimeout(() => {
            interval = null;
            use();
        }, delay)
    };
}

//Режим Публикация
//Функция загрузки изображения
function fileDownload() {
    hiddenElement(unloadStorageItem('error'));
    const fileCall = document.createElement('input');
    fileCall.setAttribute('id', 'fileInput');
    fileCall.setAttribute('type', 'file');
    fileCall.setAttribute('accept', 'image/jpeg, image/png');
    hiddenElement(fileCall);
    unloadStorageItem('menu').appendChild(fileCall);

    document.querySelector('#fileInput').addEventListener('change', (event) => {
        const array = Array.from(event.currentTarget.files);
        if (selectedImage.dataset.load === 'load') {
            deleteComment();
            traces = [];
        }
        sendFiles(array);
    });
    fileCall.click();
    unloadStorageItem('menu').removeChild(fileCall);
}

//drag&drop
function dragDropFile() {
    event.preventDefault();
    hiddenElement(unloadStorageItem('error'));
    const array = Array.from(event.dataTransfer.files);


    //если повторно дропаем файл выдаёт ошибку
    switch (selectedImage.dataset.load) {
        case 'load':
            showElement(unloadStorageItem('error'));
            unloadStorageItem('error').lastElementChild.textContent = 'Чтобы загрузить новое изображение, пожалуйста, воспользуйтесь пунктом "Загрузить новое" в меню';
            unseenError();
            return;
    }

    //если файл нужного типа, производим загрузку, иначе показываем ошибку.
    array.forEach(file => {
        switch (file.type) {
            case 'image/jpeg':
            case 'image/png':
                sendFiles(array);
                break;
            default:
                showElement(unloadStorageItem('error'));
                break;
        }
    });
}

//загружаем изображение на сервер
function sendFiles(files) {
    const formData = new FormData();
    files.forEach(file => {
        const title = removeFileExtension(file.name);
        formData.append('title', title);
        formData.append('image', file);
    });

    showElement(loader);

    fetch(`${api}/pic`, {
        body: formData,
        credentials: 'same-origin',
        method: 'POST'
    })
        .then(result => {
            if (result.status >= 200 && result.status < 300) {
                return result;
            }
            throw new Error(result.statusText);
        })
        .then(result => result.json())
        .then(result => {
            getFileInfo(result.id);
        })
        .catch(e => {
            console.log(e);
            hiddenElement(loader);
        });
}

//удаление форм комментариев на холсте при загрузке нового изображения
function deleteComment() {
    Array.from(appWrap.getElementsByClassName('comments__form')).forEach(i => i.remove());
}

//информация о файле
function getFileInfo(id) {
    const xhr = new XMLHttpRequest();
    xhr.open(
        'GET',
        `${api}/pic/${id}`,
        false
    );
    xhr.send();

    dataGet = JSON.parse(xhr.responseText);
    host = new URL(`${window.location.protocol}${window.location.host}${window.location.pathname}?id=${dataGet.id}`);

    webSocket();
    appendBackdrop(dataGet);
    unloadStorageItem('burger').style.cssText = ``;
    displayMenu();


    selectedImage.addEventListener('load', () => {
        buildCanvas();
        hiddenElement(loader);
        addCommentWrapperCanvas();
        selectedImage.dataset.load = 'load';
    });
    refreshCommentForm(dataGet.comments);
}

//Режим Рецензирования
//меню Комментарии
function openComments() {
    unloadStorageItem('menu').dataset.state = 'default';
    Array.from(unloadStorageItem('menu').getElementsByClassName('mode')).forEach(menuPoint => {
        if (!menuPoint.classList.contains('comments')) {
            return;
        }
        unloadStorageItem('menu').dataset.state = 'selected';
        menuPoint.dataset.state = 'selected';
    })
}

//фон
function appendBackdrop(file) {
    selectedImage.src = file.url;

}

//показ пунктов меню
function displayMenu() {
    unloadStorageItem('menu').dataset.state = 'default';
    Array.from(unloadStorageItem('menu').getElementsByClassName('mode')).forEach(menuPoint => {
        menuPoint.dataset.state = '';
        menuPoint.addEventListener('click', () => {
            if (!menuPoint.classList.contains('new')) {
                unloadStorageItem('menu').dataset.state = 'selected';
                menuPoint.dataset.state = 'selected';
            }
            if (menuPoint.classList.contains('share')) {
                urlMenu.value = host;
            }
        })
    })

}

//скрыть комментарии
function checkboxOff() {
    Array.from(document.getElementsByClassName('comments__form')).forEach(form => {
        form.style.display = 'none';
    })
}

//показать комментарии
function checkboxOn() {
    Array.from(document.getElementsByClassName('comments__form')).forEach(form => {
        form.style.display = '';
    })
}

//на обертке создаем формы комментариев
function createCommentForm(event) {
    if (!(unloadStorageItem('menu').querySelector('.comments').dataset.state === 'selected') || !appWrap.querySelector('#comments-on').checked) {
        return;
    }
    wrapCanvas.appendChild(addComment(event.offsetX, event.offsetY));
}

//создаём саму обёртку для комментариев
function addCommentWrapperCanvas() {
    const width = getComputedStyle(appWrap.querySelector('.current-image')).width;
    const height = getComputedStyle(appWrap.querySelector('.current-image')).height;
    wrapCanvas.style.cssText = `
		width: ${width};
		height: ${height};
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		display: block;
	`;
    appWrap.appendChild(wrapCanvas);

    // отображаем комментарии по клику поверх остальных окон комментариев
    wrapCanvas.addEventListener('click', event => {
        if (event.target.closest('form.comments__form')) {
            Array.from(wrapCanvas.querySelectorAll('form.comments__form')).forEach(form => {
                form.style.zIndex = 2;
            });
            event.target.closest('form.comments__form').style.zIndex = 3;
        }
    });
}

//функция гененрирования формы комментария
function templateJSengine(block) {
    if (Array.isArray(block)) {
        return block.reduce(function (f, item) {
            f.appendChild(templateJSengine(item));

            return f;
        }, document.createDocumentFragment());
    }

    const element = document.createElement(block.tag);

    element.classList.add(block.cls);

    if (block.attrs) {
        Object.keys(block.attrs).forEach(key => {
            element.setAttribute(key, block.attrs[key]);
        });
    }

    if (block.content) {
        element.appendChild(templateJSengine(block.content));
    }

    return element;
}

//форма комментрия, сформированная в виде объекта с ключами
let html = {
    tag: 'form',
    cls: 'comments__form',
    content: [
        {
            tag: 'span',
            cls: 'comments__marker'
        },
        {
            tag: 'input',
            cls: 'comments__marker-checkbox',
            attrs: {
                type: 'checkbox'
            }
        },
        {
            tag: 'div',
            cls: 'comments__body',
            content: [
                {
                    tag: 'div',
                    cls: 'comment',
                    content: [
                        {
                            tag: 'div',
                            cls: 'loader',
                            content: [
                                {
                                    tag: 'span'
                                },
                                {
                                    tag: 'span'
                                },
                                {
                                    tag: 'span'
                                },
                                {
                                    tag: 'span'
                                },
                                {
                                    tag: 'span'
                                }
                            ]
                        }
                    ]
                },
                {
                    tag: 'textarea',
                    cls: 'comments__input',
                    attrs: {
                        type: 'text',
                        placeholder: 'Напишите ответ..'
                    }
                },
                {
                    tag: 'input',
                    cls: 'comments__close',
                    attrs: {
                        type: 'button',
                        value: 'Закрыть'
                    }
                },
                {
                    tag: 'input',
                    cls: 'comments__submit',
                    attrs: {
                        type: 'submit',
                        value: 'Отправить'
                    }
                }

            ]
        }


    ]
};

//Форма комментариев
function addComment(x, y) {
    let commentForm = document.body.appendChild(templateJSengine(html));
    const left = x - 22;
    const top = y - 14;
    commentForm.style.cssText = `
		top: ${top}px;
		left: ${left}px;
		z-index: 2;
	`;
    commentForm.dataset.left = left;
    commentForm.dataset.top = top;

    hiddenElement(commentForm.querySelector('.loader').parentElement);
    //кнопка "закрыть"
    commentForm.querySelector('.comments__close').addEventListener('click', () => {
        commentForm.querySelector('.comments__marker-checkbox').checked = false;
    });

  //  commentForm.addEventListener('click', closeComments);

   // function closeComments(event){
      /*  if(event.target.querySelector('.comments__marker-checkbox').checked === true){
            return;
        }*/
      //  event.target.querySelector('.comments__marker-checkbox').checked = true;
       // for (let check of  commentForm.querySelectorAll('.comments__marker-checkbox'))
      //  {
   //         check.checked = false;
  //      }
  //  }
    // кнопка "отправить"
    commentForm.addEventListener('submit', sendMessages);

    // Отправляем комментарии
    function sendMessages(event) {
        if (event) event.preventDefault();
        const message = commentForm.querySelector('.comments__input').value;
        const sendMessage = `message=${encodeURIComponent(message)}&left=${encodeURIComponent(left)}&top=${encodeURIComponent(top)}`;
        sendComment(sendMessage);
        showElement(commentForm.querySelector('.loader').parentElement);
        commentForm.querySelector('.comments__input').value = '';
    }

    // Отправка комментария на сервер
    function sendComment(message) {
        fetch(`${api}/pic/${dataGet.id}/comments`, {
            method: 'POST',
            body: message,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
        })
            .then(result => result.json())
            .catch(e => {
                console.log(e);
                commentForm.querySelector('.loader').parentElement.style.display = 'none';
            });
    }

    return commentForm;
}

//обновление форм с комментриями
function refreshCommentForm(comment) {
    if (!comment) {
        return;
    }
    Object.keys(comment).forEach(id => {
        if (id in showComments) return;

        showComments[id] = comment[id];
        let requiredNewForm = true;

        Array.from(appWrap.querySelectorAll('.comments__form')).forEach(form => {

            //добавляем сообщение в форму с заданными координатами left и top
            if (+form.dataset.left === showComments[id].left) {
                if (+form.dataset.top === showComments[id].top) {
                    form.querySelector('.loader').parentElement.style.display = 'none';
                    addingCommentForm(comment[id], form);
                    requiredNewForm = false;
                }
            }
        });
        //создаем форму и добавляем в нее сообщение
        if (requiredNewForm) {
            const newForm = addComment(comment[id].left + 22, comment[id].top + 14);
            newForm.dataset.left = comment[id].left;
            newForm.dataset.top = comment[id].top;
            newForm.style.left = comment[id].left + 'px';
            newForm.style.top = comment[id].top + 'px';
            wrapCanvas.appendChild(newForm);
            addingCommentForm(comment[id], newForm);
            if (!appWrap.querySelector('#comments-on').checked) {
                newForm.style.display = 'none';
            }
        }
    });

}

//Добавление комментария в форму
function addingCommentForm(msg, form) {
    let divLoaderParent = form.querySelector('.loader').parentElement;

    const divMessageNew = document.createElement('div');
    divMessageNew.classList.add('comment');
    divMessageNew.dataset.timestamp = msg.timestamp;

    const timeComment = document.createElement('p');
    timeComment.classList.add('comment__time');
    timeComment.textContent = giveTime(msg.timestamp);
    divMessageNew.appendChild(timeComment);

    const messageComment = document.createElement('p');
    messageComment.classList.add('comment__message');
    messageComment.textContent = msg.message;
    divMessageNew.appendChild(messageComment);

    form.querySelector('.comments__body').insertBefore(divMessageNew, divLoaderParent);
}

//веб-сокет
function webSocket() {
    connection = new WebSocket(`wss://neto-api.herokuapp.com/pic/${dataGet.id}`);

    connection.addEventListener('message', event => {
        if (JSON.parse(event.data).event === 'pic') {
            if (JSON.parse(event.data).pic.mask) {
                canvas.style.background = `url(${JSON.parse(event.data).pic.mask})`;
            } else {
                canvas.style.background = ``;
            }
        }
        if (JSON.parse(event.data).event === 'comment') {
            putCommentFormWss(JSON.parse(event.data).comment);
        }

        if (JSON.parse(event.data).event === 'mask') {
            canvas.style.background = `url(${JSON.parse(event.data).url})`;
        }
    });

}

//вставляем комментарии, полученные с сервера
function putCommentFormWss(com) {
    const wssComm = {};
    wssComm[com.id] = {};
    wssComm[com.id].left = com.left;
    wssComm[com.id].message = com.message;
    wssComm[com.id].timestamp = com.timestamp;
    wssComm[com.id].top = com.top;
    refreshCommentForm(wssComm);
}


function findId(id) {
    if (!id) {
        return;
    }
    getFileInfo(id);
    openComments();
}

//функция создания холста для рисования
function buildCanvas() {
    const width = getComputedStyle(appWrap.querySelector('.current-image')).width.slice(0, -2);
    const height = getComputedStyle(appWrap.querySelector('.current-image')).height.slice(0, -2);
    canvas.width = width;
    canvas.height = height;
    canvas.style.zIndex = '1';
    canvas.style.position = 'absolute';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.display = 'block';
    canvas.style.top = '0';
    canvas.style.left = '0';
    wrapCanvas.appendChild(canvas);
}

// кисть
function circle(point) {
    ctx.beginPath();
    ctx.arc(...point, PAINT_SIZE / 2, 0, 2 * Math.PI);
    ctx.fill();
}

//кривая между точками
function flatTraceAmong(point1, point2) {
    const cp = point1.map((coord, i) => (coord + point2[i]) / 2);
    ctx.quadraticCurveTo(...point1, ...cp);
}

//линия
function flatTrace(points) {
    ctx.beginPath();
    ctx.lineWidth = PAINT_SIZE;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    ctx.moveTo(...points[0]);

    for (let i = 1; i < points.length - 1; i++) {
        flatTraceAmong(points[i], points[i + 1]);
    }

    ctx.stroke();
}

// координаты положения курсора
function doDot(x, y) {
    return [x, y];
}

// перерисовка canvas
function repaint() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    traces.forEach((trace) => {
        ctx.strokeStyle = trace.color;
        ctx.fillStyle = trace.color;

        circle(trace[0]);
        flatTrace(trace);

    });
}

//отправялем canvas на сервер
function maskStatus() {
    canvas.toBlob(function (blob) {
        connection.send(blob);
        console.log(connection);
    });
}

function beat() {
    if (unloadStorageItem('menu').offsetHeight > 66) {
        unloadStorageItem('menu').style.left = (appWrap.offsetWidth - unloadStorageItem('menu').offsetWidth) - 10 + 'px';
    }

    // рисуем canvas
    if (redraw) {
        repaint();
        redraw = false;
    }

    window.requestAnimationFrame(beat);
}

// для каждого каждого элемента с классом '.menu__color' и если элемент выбран  (checked), получим цвет
Array.from(colorMenu).forEach(color => {
    if (color.checked) {
        selectedColor = getComputedStyle(color.nextElementSibling).backgroundColor;
    }
    color.addEventListener('click', (event) => { //при клике на элемент, получим цвет
        selectedColor = getComputedStyle(event.currentTarget.nextElementSibling).backgroundColor;
    });
});

const ctx = canvas.getContext('2d'); //контекст, где мы рисуем
const PAINT_SIZE = 4; //размер кисти
let traces = [];
let sketch = false;
let redraw = false;

canvas.addEventListener("mousedown", (event) => {
    if (unloadStorageItem('menu').querySelector('.draw').dataset.state !== 'selected') {
        return;
    }
    sketch = true;
    const trace = [];
    trace.color = selectedColor;
    trace.push(doDot(event.offsetX, event.offsetY));
    traces.push(trace);
    redraw = true;
});

canvas.addEventListener("mouseup", () => {
    unloadStorageItem('menu').style.zIndex = '1';
    sketch = false;
});

canvas.addEventListener('mouseleave', () => {
    sketch = false;
});

canvas.addEventListener("mousemove", (event) => {
    if (sketch) {
        unloadStorageItem('menu').style.zIndex = '0';
        traces[traces.length - 1].push(doDot(event.offsetX, event.offsetY));
        redraw = true;
        cleanSendMask();
    }
});

const cleanSendMask = clean(maskStatus, 1000);

beat();
//разрываем соединение при закрытии страницы
window.addEventListener('beforeunload', () => {
    connection.close();
    console.log('Веб-сокет закрыт')
});