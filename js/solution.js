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
const commentsToggle = document.querySelectorAll('.menu__toggle');
const copyMenu = document.querySelector('.menu_copy');
const colorMenu = document.querySelectorAll('.menu__color');
const urlMenu = document.querySelector('.menu__url');

let movingBurger = null;
let minY, minX, maxX, maxY;
let shiftX = 0;
let shiftY = 0;

const ctx = canvas.getContext('2d'); //контекст, где мы рисуем
const PAINT_SIZE = 4; //размер кисти
let traces = [];
let sketch = false;
let redraw = false;

// Перемещение бургера
function dragBurger(event) {
    if (!event.target.classList.contains('drag')) {
        return;
    }
    movingBurger = event.target.parentElement;
    minX = appWrap.offsetLeft;
    minY = appWrap.offsetTop;
    maxX = appWrap.offsetWidth - (movingBurger.offsetWidth + 1);
    maxY = appWrap.offsetHeight - (movingBurger.offsetHeight + 1);
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
    if (item.classList.contains('image-loader')) {
        item.classList.remove('messageImg')
    }
    item.classList.add('hidden');


}

// Показываем элементы
function showElement(item) {
    if (item.classList.contains('image-loader')) {
        item.classList.add('messageImg')
    }
    item.classList.remove('hidden');
}

getTheItemInTheStore('menu');
getTheItemInTheStore('burger');
getTheItemInTheStore('error');

//Первый режим - режим Публикации
//убираем меню режима Публикации
unloadStorageItem('menu').dataset.state = 'initial';
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

// для каждого каждого элемента с классом '.menu__color' и если элемент выбран checked получаем цвет
colorMenu.forEach(color => {
    if (color.checked) {
        selectedColor = getComputedStyle(color.nextElementSibling).backgroundColor;
    }
    color.addEventListener('click', (event) => { //при клике на элемент, получим цвет
        selectedColor = getComputedStyle(event.currentTarget.nextElementSibling).backgroundColor;
    });
});


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
    if (unloadStorageItem('menu').classList.contains('add-zindex-zero')){
        unloadStorageItem('menu').classList.remove('add-zindex-zero');
    }
     sketch = false;
});


canvas.addEventListener('mouseleave', () => {
    if(unloadStorageItem('menu').classList.contains('add-zindex-zero')){
        unloadStorageItem('menu').classList.remove('add-zindex-zero');
    }

    sketch = false;

});

canvas.addEventListener("mousemove", (event) => {
    if (sketch) {
        unloadStorageItem('menu').classList.add('add-zindex-zero');
        traces[traces.length - 1].push(doDot(event.offsetX, event.offsetY));
        redraw = true;
        cleanSendMask();
    }
});

document.addEventListener('mouseup', () => {
    if(unloadStorageItem('menu').classList.contains('add-zindex-zero')){
        unloadStorageItem('menu').classList.remove('add-zindex-zero');
    }

});

const cleanSendMask = clean(maskStatus, 1000);

beat();
//разрываем соединение при закрытии страницы
window.addEventListener('beforeunload', () => {
    connection.close();
    console.log('Веб-сокет закрыт')
});

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

    fileCall.addEventListener('change', (event) => {
        let array = [];
        for (let i = 0; i < event.currentTarget.files.length; i++) {
          array.push(event.currentTarget.files[i]);
        }
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
    let array = [];
    for (let i =0; i < event.dataTransfer.files.length; i++) {
        array.push(event.dataTransfer.files[i]);
    }

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
            hiddenElement(loader);
        })
        .catch(e => {
            console.log(e);
            hiddenElement(loader);
        });
}

//удаление форм комментариев на холсте при загрузке нового изображения
function deleteComment() {
    appWrap.querySelectorAll('.comments__form').forEach(i => i.remove());
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
    displayMenu();

    selectedImage.addEventListener('load', () => {

        hiddenElement(loader);
        addCommentWrapperCanvas();
        buildCanvas();
        selectedImage.dataset.load = 'load';
    });
    refreshCommentForm(dataGet.comments);
}

//Режим Рецензирования
//меню Комментарии
function openComments() {

    unloadStorageItem('menu').dataset.state = 'default';
    showElement(unloadStorageItem('burger'));
    unloadStorageItem('menu').querySelectorAll('.mode').forEach(menuPoint => {
        if (!menuPoint.classList.contains('comments')) {
            return;
        }
        unloadStorageItem('menu').dataset.state = 'selected';
        menuPoint.dataset.state = 'selected';
    });

}

//фон
function appendBackdrop(file) {
    selectedImage.src = file.url;


}

//показ пунктов меню
function displayMenu() {
    delEmptyChats();
    unloadStorageItem('menu').dataset.state = 'default';
    showElement(unloadStorageItem('burger'));
    unloadStorageItem('menu').querySelectorAll('.mode').forEach(menuPoint => {
        menuPoint.dataset.state = '';
        menuPoint.addEventListener('click', () => {
            if (!menuPoint.classList.contains('new')) {
                unloadStorageItem('menu').dataset.state = 'selected';
                menuPoint.dataset.state = 'selected';
            }
            if (menuPoint.classList.contains('share')) {
                unloadStorageItem('menu').querySelector('.menu__url').value = host;
            }
        })
    })

}

//Комментарий сворачивается при клике на другой комментарий
function hideAllComments() {
    const commentsList = document.querySelectorAll('.comments__marker-checkbox');

    if (commentsList) {
        commentsList.forEach(comment => {
            comment.checked = false;
        });
    }
}

//показ комментариев и скрытие их
for (let i = 0; i < commentsToggle.length; i++) {
    commentsToggle[i].addEventListener('click', (event) => {
        delEmptyChats();
        const radioValue = event.target.value,
            comments = document.querySelectorAll('.comments__form');
        if (radioValue === 'off') {
            commentsToggle[0].checked = false;
            commentsToggle[1].checked = true;

            comments.forEach(comment => {
                hiddenElement(comment);
            });
        } else {
            commentsToggle[0].checked = true;
            commentsToggle[1].checked = false;

            comments.forEach(comment => {
                showElement(comment);
            });
        }

    });
}


//на обертке создаем формы комментариев
function createCommentForm(event) {
    delEmptyChats();
    if (!(unloadStorageItem('menu').querySelector('.comments').dataset.state === 'selected') || !commentsToggle[0].checked) {
        return;
    }
    hideAllComments();
    wrapCanvas.appendChild(addComment(event.offsetX, event.offsetY)).querySelector('.comments__marker-checkbox').checked = true;

}

//функция создания холста для рисования
function buildCanvas() {
    const width = getComputedStyle(appWrap.querySelector('.current-image')).width.slice(0, -2);
    const height = getComputedStyle(appWrap.querySelector('.current-image')).height.slice(0, -2);
    canvas.width = width;
    canvas.height = height;
    canvas.className = 'canvas';
    wrapCanvas.appendChild(canvas);
}

//Удаляем указанный чат или все пустые чаты на холсте
function delEmptyChats(form = null) {
    if (form && !form.classList.contains('containsMsg')) {
        wrapCanvas.removeChild(form);
        return;
    }

    const comments = document.querySelectorAll('.comments__form');

    if (!comments) {
        return;
    }

    comments.forEach(comment => {
        if (!comment.classList.contains('containsMsg')) {
            comment.parentElement.removeChild(comment);
        }
    });
}

//создаём саму обёртку для комментариев
function addCommentWrapperCanvas() {
    const width = getComputedStyle(appWrap.querySelector('.current-image')).width;
    const height = getComputedStyle(appWrap.querySelector('.current-image')).height;
    wrapCanvas.style.width = width;
    wrapCanvas.style.height = height;
    wrapCanvas.className = 'wrap-canvas';
    appWrap.appendChild(wrapCanvas);

    // отображаем комментарии по клику поверх остальных окон комментариев
    wrapCanvas.addEventListener('click', event => {
        if (event.target.closest('form.comments__form')) {
            wrapCanvas.querySelectorAll('form.comments__form').forEach(form => {
                form.classList.add('add-zindex-two');
                if (form.classList.contains('add-zindex-three')){
                    form.classList.remove('add-zindex-three');
                }
            });

            event.target.closest('form.comments__form').classList.add('add-zindex-three');
            if(event.target.closest('form.comments__form').classList.contains('add-zindex-two')){
                event.target.closest('form.comments__form').classList.remove('add-zindex-two');
            }
        }
    });
}

//функция генерирования формы комментария
function templateJSengine(block) {
    if ((block === undefined) || (block === null) || (block === false)) {
        return document.createTextNode('');
    }

    if ((typeof block === 'string') || (typeof block === 'number') || (block === true)) {
        return document.createTextNode(block);
    }

    if (Array.isArray(block)) {
        return block.reduce(function (f, item) {
            f.appendChild(templateJSengine(item));

            return f;
        }, document.createDocumentFragment());
    }

    const element = document.createElement(block.tag);

    element.classList.add(...[].concat(block.cls || []));

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

//Форма комментариев
function addComment(x, y) {
    delEmptyChats();

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

    let commentForm = document.body.appendChild(templateJSengine(html));
    const left = x - 22;
    const top = y - 14;
    commentForm.style.top = `${top}px`;
    commentForm.style.left = `${left}px`;
    commentForm.classList.add('add-zindex-two');
    commentForm.dataset.left = left;
    commentForm.dataset.top = top;
    hideAllComments();

    hiddenElement(commentForm.querySelector('.loader').parentElement);
    //кнопка "закрыть"
    commentForm.querySelector('.comments__close').addEventListener('click', () => {
        event.preventDefault();
        commentForm.querySelector('.comments__marker-checkbox').checked = false;
        delEmptyChats(commentForm);
    });


    let check = document.querySelectorAll('.comments__marker-checkbox');


    (function () {

        for (let i = 0; i < check.length; i++) {

            check[i].addEventListener('click', function () {
                delEmptyChats();
                if (this.checked) {
                    for (let j = 0; j < check.length; j++) {
                        check[j].checked = false;
                    }
                    this.checked = true;
                }
            });
        }
    })();

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
                hiddenElement(commentForm.querySelector('.loader').parentElement);
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

        appWrap.querySelectorAll('.comments__form').forEach(form => {

            //добавляем сообщение в форму с заданными координатами left и top
            if (+form.dataset.left === showComments[id].left && +form.dataset.top === showComments[id].top) {
                hiddenElement(form.querySelector('.loader').parentElement);
                addingCommentForm(comment[id], form);
                requiredNewForm = false;
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
            if (!commentsToggle[0].checked) {
                hiddenElement(newForm);
            }
        }
    });

}

//Добавление комментария в форму
function addingCommentForm(msg, form) {
    let divLoaderParent = form.querySelector('.loader').parentElement;

    let msgElTemplate = {
        tag: 'div',
        cls: 'comment',
        attrs: {
            'data-timestamp': msg.timestamp
        },
        content: [
            {
                tag: 'p',
                cls: 'comment__time',
                content: giveTime(msg.timestamp)
            }
        ]
    };

    msg.message.split('\n').forEach(mesg => {
        if (!mesg) {
            msgElTemplate.content.push({tag: 'br'});
        }
        msgElTemplate.content.push({
            tag: 'p',
            cls: 'comment__message',
            content: mesg
        });
    });

    form.querySelector('.comments__body').insertBefore(templateJSengine(msgElTemplate), divLoaderParent);
    form.classList.add('containsMsg');
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
    while (unloadStorageItem('menu').offsetHeight > 66) {
        unloadStorageItem('menu').style.left = (appWrap.offsetWidth - unloadStorageItem('menu').offsetWidth) - 10 + 'px';
    }

    // рисуем canvas
    if (redraw) {
        repaint();
        redraw = false;

    }

    window.requestAnimationFrame(beat);
}

