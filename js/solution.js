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
    const xhrGetInfo = new XMLHttpRequest();
    xhrGetInfo.open(
        'GET',
        `${ws}/pic/${id}`,
        false
    );
    xhrGetInfo.send();

    getData = JSON.parse(xhrGetInfo.responseText);
    host = `${window.location.origin}${window.location.pathname}?id=${getData.id}`;

    wss();
    addBackground(getData);
    burger.style.cssText = ``;
    showMenu();


    currentImg.addEventListener('load', () => {
        hide(loadImg);
        addWrapforCanvsComm();
        createCanvas();
        currImg.dataset.load = 'load';
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
            const newForm = addCommentForm(comment[id].left + 22, comment[id].top + 14);
            newForm.dataset.left = comment[id].left;
            newForm.dataset.top = comment[id].top;
            newForm.style.left = comment[id].left + 'px';
            newForm.style.top = comment[id].top + 'px';
            wrapComments.appendChild(newForm);
            addMessageComment(comment[id], newForm);
            if (!wrapApp.querySelector('#comments-on').checked) {
                newForm.style.display = 'none';
            }
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
function addCommentForm(x, y) {
    
}

//Режим Публикации!

// скрываем пункты меню для режима "Публикации"
currentImg.src = '';
wrapApp.dataset.state ='';
hide(burger);

//убираем комментарии в режиме "Публикации"
wrapApp.removeChild(comments);

//открываем окно выбора файла для загрузки
newPic.addEventListener('click', newDataFile);