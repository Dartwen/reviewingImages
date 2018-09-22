'use strict';

const ws = 'https://neto-api.herokuapp.com';

const canvas = document.createElement('canvas');
const wrapComments = document.createElement('div');
const wrapApp = document.querySelector('.app');
const menu = document.querySelector('.menu');
const currentImg = document.querySelector('.current-image');
const burger = menu.querySelector('.burger');
const comments = menu.querySelector('.comments');
const newPic = menu.querySelector('.new');
const error = document.querySelector('.error');
const loader = document.querySelector('.image-loader');
const formComment = document.querySelector('.comments__form').cloneNode(true);

let getData;
let host;
let connection;
let showComments = {};

// Убираем расширение файла
function removeExtension(inputText) {
    let regExp = new RegExp(/\.[^.]+$/gi);
    return inputText.replace(regExp, '');
}

// скрыть текст ошибки через 7сек.
function hideError() {
    setTimeout(function() {
        hide(error)
    }, 7000);
}
//разбиваем timestemp, чтобы мы могли отображать дату и время
function dataTime(timestamp) {
    const options = {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    };
    const date = new Date(timestamp);
    const dateString = date.toLocaleString('ru-RU', options);

    return dateString.slice(0, 8) + dateString.slice(9);
}

// Скрываем элементы
function hide(el) {
    el.style.display = 'none';
}

//функция добавки файла для загрузки
function newDataFile(){
    hide(error);
    //добавим форму для вызова окна "выбора файла"
    const input = document.createElement('input');
    input.setAttribute('id', 'fileInput');
    input.setAttribute('type', 'file');
    input.setAttribute('accept', 'image/jpeg, image/png');
    hide(input);
    menu.appendChild(input);

    document.querySelector('#fileInput').addEventListener('change', event => {
        const files = Array.from(event.currentTarget.files);
        sendFile(files);
    });

    input.click();
    menu.removeChild(input);
}

// загрузка изображения на сервер
function sendFile(files) {
    const formData = new FormData();

    files.forEach(file => {
        const fileTitle = removeExtension(file.name);
        formData.append('title', fileTitle);
        formData.append('image', file);
    });

    loader.removeAttribute('style');

    fetch(`${ws}/pic`, {
        body: formData,
        credentials: 'same-origin',
        method: 'POST'
    })
        .then( res => {
            if (res.status >= 200 && res.status < 300) {
                return res;
            }
            throw new Error (res.statusText);
        })
        .then(res => res.json())
        .then(res => {
            getFileInfo(res.id);
        })
        .catch(er => {
            console.log(er);
            hide(loader);
        });
}

//получаем информацию о файле
function getFileInfo(id) {
    const xhrInfo = new XMLHttpRequest();
    xhrInfo.open(
        'GET',
        `${ws}/pic/${id}`,
        false
    );
    xhrInfo.send();

    getData = JSON.parse(xhrInfo.responseText);
    host = `${window.location.origin}${window.location.pathname}?id=${getData.id}`;

    wss();
    addBackground(getData);
    burger.style.cssText = ``;
    show();


    currentImg.addEventListener('load', () => {
        hide(loadImg);
        addWrapforCanvsComm();
        createCanvas();
        currentImg.dataset.load = 'load';
    });
    updCommsForm(getData.comments);
}

//веб сокет
function wss(){
    connection = new WebSocket(`wss://neto-api.herokuapp.com/pic/${getData.id}`);
    connection.addEventListener('message', event => {

        if (JSON.parse(event.data).event === 'pic'){
            if (JSON.parse(event.data).pic.mask) {
                canvas.style.background = `url(${JSON.parse(event.data).pic.mask})`;
            }
        }

        if (JSON.parse(event.data).event === 'comment'){
            insertWssCommentForm(JSON.parse(event.data).comment);
        }

        if (JSON.parse(event.data).event === 'mask'){
            canvas.style.background = `url(${JSON.parse(event.data).url})`;
        }
    });
}

//вставка комментариев, полученных с сервера
function insertWssCommentForm(comments) {
    const commentsWs = {};
    commentsWs[comments.id] = {};
    commentsWs[comments.id].left = comments.left;
    commentsWs[comments.id].message = comments.message;
    commentsWs[comments.id].timestamp = comments.timestamp;
    commentsWs[comments.id].top = comments.top;
    updateComments(commentsWs);
}

//обновление форм с комментариями
function updateComments(comment){
    if(!comment) return;
    Object.keys(comment).forEach(id => {
        if (id in showComments) return;

        showComments[id] = comment[id];
        let createNewForm = true;

        Array.from(wrapApp.querySelectorAll('.comments__form')).forEach(form => {

            //добавляем сообщение в форму с заданными координатами left и top
            if (+form.dataset.left === showComments[id].left && +form.dataset.top === showComments[id].top) {
                form.querySelector('.loader').parentElement.style.display = 'none';
                addMessageComment(comment[id], form);
                createNewForm = false;
            }
        });

        if (createNewForm) {
            const newForm = addComment(comment[id].left + 22, comment[id].top + 14);
            newForm.dataset.left = comment[id].left;
            newForm.dataset.top = comment[id].top;
            newForm.style.left = comment[id].left + 'px';
            newForm.style.top = comment[id].top + 'px';
            wrapComments.appendChild(newForm);
            addMessageComment(comment[id], newForm);
            if (wrapApp.querySelector('#comments-on').checked) {
                return;
            }
            newForm.style.display = 'none';
        }
    });
}


//добавление комментарий в форму
function addMessageComment(message, form) {
    let parentDiv = form.querySelector('.loader').parentElement;
    const divNewMessage = document.createElement('div');

    divNewMessage.classList.add('comment');
    divNewMessage.dataset.timestamp = message.timestamp;

    const commentTime = document.createElement('p');
    commentTime.classList.add('comment__time');
    commentTime.textContent = dataTime(message.timestamp);
    divNewMessage.appendChild(commentTime);

    const commentMessage = document.createElement('p');
    commentMessage.classList.add('comment__message');
    commentMessage.textContent = message.message;
    divNewMessage.appendChild(commentMessage);

    form.querySelector('.comments__body').insertBefore(divNewMessage, parentDiv);
}

//Форма для комментариев
function addComment(x, y) {
    const left = x - 22;
    const top = y - 14;

    formComment.style.cssText = `
		top: ${top}px;
		left: ${left}px;
		z-index: 2;
	`;

    formComment.dataset.left = left;
    formComment.dataset.top = top;

    hide(formComment.querySelector('.loader').parentElement);

    //кнопка "закрыть"
    formComment.querySelector('.comments__close').addEventListener('click', () => {
        formComment.querySelector('.comments__marker-checkbox').checked = false;
    });

//кнопка "отправить"
    formComment.addEventListener('submit', sendMessage);

    function sendMessage(event) {
        if (event) event.preventDefault();
        const message = formComment.querySelector('.comments__input').value;
        const messageSend = `message=${encodeURIComponent(message)}&left=${encodeURIComponent(left)}&top=${encodeURIComponent(top)}`;
        commentsSend(messageSend);
        formComment.querySelector('.loader').parentElement.removeAttribute('style');
        formComment.querySelector('.comments__input').value = '';

    }

    function commentsSend(message) {
        fetch(`${ws}/pic/${getData.id}/comments`, {
            method: 'POST',
            body: message,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
        })
            .then(res => res.json())
            .catch(er => {
                console.log(er);
                formComment.querySelector('.loader').parentElement.style.display = 'none';
            });

    }

    return formComment;
}


//drag&drop
function fileDrop(event){
    event.preventDefault();
    hide(error);
    const files = Array.from(event.dataTransfer.files);

    //выдаем ошибку, при повторном drop изображении
    switch (currentImg.dataset.load) {
        case 'load':
            error.removeAttribute('style');
            error.lastElementChild.textContent = 'Чтобы загрузить новое изображение, пожалуйста, воспользуйтесь пунктом "Загрузить новое" в меню';
            hideError();
            return;
    }

    //проверяем перетаскиваемый файл, если файл нужного типа, то загружаем, иначе показываем ошибку.
    files.forEach(file => {
        switch (file.type) {
            case 'image/jpeg':
            case 'image/png':
                sendFile(files);
                break;
            default:
                error.removeAttribute('style');
                break;
        }
    });
}

//показываются пункты меню
function show(){
    menu.dataset.state = 'default';

    Array.from(menu.querySelectorAll('.mode')).forEach(menuItem => {
        menuItem.dataset.state = '';
        menuItem.addEventListener('click', () => {
            if (!menuItem.classList.contains('new')) {
                menu.dataset.state = 'selected';
                menuItem.dataset.state = 'selected';
            }

            if (menuItem.classList.contains('share')) {
                menu.querySelector('.menu__url').value = host;
            }
        })
    })
}

//создаем формы на обертке для комментариев
function createComment(event) {
    if (!(comments.dataset.state === 'selected')) {
        return;
    } else if (!wrapApp.querySelector('#comments-on').checked) {
        return;
    }
    wrapComments.appendChild(addComment(event.offsetX, event.offsetY));
}

//"показать комментарии"
function checkboxOn() {
    const forms = document.querySelectorAll('.comments__form');
    Array.from(forms).forEach(form => {
        form.style.display = '';
    })
}

//"скрыть комментарии"
function checkboxOff() {
    const forms = document.querySelectorAll('.comments__form');
    Array.from(forms).forEach(form => {
        form.style.display = 'none';
    })
}

//Копируем ссылку из пункта меню "Поделиться"
function copyURL(){
    menu.querySelector('.menu__url').select();

    try{
        let safely = document.execCommand('copy');
        let message;
        message = safely ? 'успешно' : 'нет';
        console.log(`URL ${msg} скопирован`);
    }
    catch{
        console.log('Ошибка копирования')
    }
    window.getSelection().removeAllRanges();
}

let url = new URL(`${window.location.href}`);
let argumentId = url.searchParams.get('id'); //ищем параметр 'id'
function findId(){
    
}
// ----------режим "Публикация"------------------------------------------------------------------------------------

// скрываем пункты меню для режима "Публикации"
currentImg.src = '';

menu.dataset.state = 'initial';
wrapApp.dataset.state ='';
hide(burger);

//убираем комментарии в режиме "Публикации"
wrapApp.removeChild(document.querySelector('.comments__form'));

//открываем окно выбора файла для загрузки
newPic.addEventListener('click', newDataFile);

//загрузка файла drag&drop
wrapApp.addEventListener('drop', fileDrop);
wrapApp.addEventListener('dragover', event => event.preventDefault());

// ----------режим "Рецензирование"---------------------------------------------------------------------------------

//при клике на burger показывается меню
burger.addEventListener('click', show);

//при клике на холсте создаем форму комментариев
canvas.addEventListener('click', createComment);

//Переключатели "Показывать комментарии"
menu.querySelector('.menu__toggle-title_on').addEventListener('click', checkboxOn);
menu.querySelector('#comments-on').addEventListener('click', checkboxOn);

//Переключатели "Скрыть комментарии"
menu.querySelector('.menu__toggle-title_off').addEventListener('click', checkboxOff);
menu.querySelector('#comments-off').addEventListener('click', checkboxOff);

// копируем ссылку по клику на кнопку "Копировать" в режиме "Поделиться"
menu.querySelector('.menu_copy').addEventListener('click', copyURL);

//Находим id из ссылки
findId(argumentId);