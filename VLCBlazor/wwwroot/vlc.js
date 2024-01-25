import { update_overlay, on_overlay_click } from "./lib/overlay.js";
import { MediaPlayer } from "./lib/libvlc.js";


// Module loader
var spinnerElement = document.getElementById('spinner');
var overlayElement = document.getElementById('canvas');
var spinnerLdsElement = document.getElementById('spinner-lds');

var body = document.getElementById('body');
var isLoading = new CustomEvent('isLoading', { detail: { loading: true } });
var isNotLoading = new CustomEvent('isLoading', { detail: { loading: false } });

// This should be set to true once the user clicks on the canvas for the first time
var was_clicked = false;

var VlcModuleExt = {
    preRun: [function () {
        window.display_overlay = true;
    }],
    vlc_access_file: {},
    onRuntimeInitialized: function () { },
    print: (function () {
        var element = document.getElementById('output');
        if (element) element.value = ''; // clear browser cache
        return function (text) {
            if (arguments.length > 1) text = Array.prototype.slice.call(arguments).join(' ');
            console.log(text);
            if (element) {
                element.value += text + "\n";
                element.scrollTop = element.scrollHeight; // focus on bottom
            }
        };
    })(),
    printErr: function (text) {
        if (arguments.length > 1) text = Array.prototype.slice.call(arguments).join(' ');
        console.error(text);
    },

    canvas: (function () {
        var canvas = document.getElementById('canvas');
        canvas.addEventListener("webglcontextlost", function (e) {
            alert('WebGL context lost. You will need to reload the page.');
            e.preventDefault();
        });
        return canvas;
    })(),
    setStatus: function (text) {
        if (!VlcModuleExt.setStatus.last) VlcModuleExt.setStatus.last = { time: Date.now(), text: '' };
        if (text === VlcModuleExt.setStatus.last.text) return;
        var m = text.match(/([^(]+)\((\d+(\.\d+)?)\/(\d+)\)/);
        var now = Date.now();
        if (m && now - VlcModuleExt.setStatus.last.time < 30) return;
        VlcModuleExt.setStatus.last.time = now;
        VlcModuleExt.setStatus.last.text = text;

        if (m) {
            text = m[1];
            body.dispatchEvent(isLoading);
        } else {
            body.dispatchEvent(isNotLoading);
        }
    },
    totalDependencies: 0,
    monitorRunDependencies: function (left) {
        this.totalDependencies = Math.max(this.totalDependencies, left);
        VlcModuleExt.setStatus(left ? 'Preparing... (' + (this.totalDependencies - left) + '/' + this.totalDependencies + ')' : 'All downloads complete.');
    }
};


///



var vlc_options = "";

var showCanvas = new CustomEvent('toggleCanvas', { detail: { files: true } });
var hideCanvas = new CustomEvent('toggleCanvas', { detail: { files: false } });

async function initVlcAsync(playerRef) {
    const body = document.getElementById('body');
    const playerApp = document.getElementById('playerApp');
    const stack = document.getElementById('stack');
    const spinner = document.getElementById('spinner-lds');
    const pOverlay = document.getElementById("p-overlay");
    const playButton = document.getElementById("play-button");
    const bottomBar = document.getElementById("bottom-bar");
    const volume = document.getElementById("volume");
    const progressVolume = document.getElementById("bottom-progress-volume");
    const reloadBtn = document.getElementById('reload');
    const resetBtn = document.getElementById('reset-options');
    const buttonBarPlayButton = document.getElementById('bottom-bar-play-button-svg');
    const nextChapter = document.getElementById('next-chapter');
    const previousChapter = document.getElementById('previous-chapter');
    const chapterButtons = document.getElementById('chapter-buttons');

  
    if (reloadBtn) {
        reloadBtn.addEventListener('click', () => {
            window.location.reload();
        });
    }

    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
           //localStorage.setItem('options', '--codec=webcodec --aout=emworklet_audio -vvv --input-repeat=10000');
            reloadBtn.click();
        });
    }

    var options = "";
    options = "--codec=webcodec --aout=emworklet_audio -vvv --input-repeat=10000";//localStorage.getItem('options') || '--codec=webcodec --aout=emworklet_audio -vvv --input-repeat=10000';

    localStorage.setItem('validoptions', options);

    pOverlay.addEventListener('mouseenter', e => {
        if (window.files && window.files.length) {
            playButton.classList.remove('eject-svg');
            playButton.classList.remove('hide-button');
            bottomBar.classList.remove('hide-bottom-bar');
            chapterButtons.classList.remove('hide-chapters');
        }
    });

    pOverlay.addEventListener('mouseleave', e => {
        if (window.files && window.files.length) {
            playButton.classList.add('hide-button');
            bottomBar.classList.add('hide-bottom-bar');
            chapterButtons.classList.add('hide-chapters');
        }
    });

    volume.addEventListener('mouseenter', e => {
        progressVolume.classList.remove('hide-volume');
    });

    volume.addEventListener('mouseleave', e => {
        progressVolume.classList.add('hide-volume');
    });

    body.addEventListener('isLoading', event => {
        if (event.detail.isLoading) {
            spinner.style.display = 'block';
            playerApp.style.display = 'none';
        }

        if (!event.detail.isLoading) {
            spinner.style.display = 'none';
            playerApp.style.display = 'block';
        }
    });

    body.addEventListener('toggleCanvas', event => {
        if (event.detail.files) {
            chapterButtons.classList.remove('hide-chapters');
            playButton.classList.remove('eject-svg');
            playButton.classList.remove('hide-button');
            playButton.innerHTML = '<div><svg><path d="M15.562 8.1L3.87.225c-.818-.562-1.87 0-1.87.9v15.75c0 .9 1.052 1.462 1.87.9L15.563 9.9c.584-.45.584-1.35 0-1.8z"></path></svg></div>';
            buttonBarPlayButton.innerHTML = '<path d="M15.562 8.1L3.87.225c-.818-.562-1.87 0-1.87.9v15.75c0 .9 1.052 1.462 1.87.9L15.563 9.9c.584-.45.584-1.35 0-1.8z"></path>';
            buttonBarPlayButton.classList.remove('bottom-bar-eject-button-svg');
            playButton.click();
        } else {
            chapterButtons.classList.add('hide-chapters');
            playButton.innerHTML = '<div><svg><path d="M7.27 1.047a1 1 0 0 1 1.46 0l6.345 6.77c.6.638.146 1.683-.73 1.683H1.656C.78 9.5.326 8.455.926 7.816L7.27 1.047zM.5 11.5a1 1 0 0 1 1-1h13a1 1 0 0 1 1 1v1a1 1 0 0 1-1 1h-13a1 1 0 0 1-1-1v-1z"/></div></svg>';
            playButton.classList.add('eject-svg');
            buttonBarPlayButton.innerHTML = '<path d="M15,290.01h270c8.284,0,15-6.716,15-15s-6.716-15-15-15H15c-8.284,0-15,6.716-15,15   S6.716,290.01,15,290.01z"/><path d="M15,210.01h270c0.006-0.001,0.013-0.001,0.02,0c8.285,0,15-6.716,15-15c0-3.774-1.394-7.223-3.695-9.859   L161.746,15.682c-2.845-3.583-7.17-5.672-11.746-5.672c-4.576,0-8.901,2.088-11.746,5.672l-135,170   c-3.58,4.508-4.265,10.666-1.762,15.85C3.995,206.716,9.244,210.01,15,210.01z"/>';
            buttonBarPlayButton.classList.add('bottom-bar-eject-button-svg');
        }
    });

    //  try {
    // VlcModule is a function generated by emscripten in experimental.js,
    // that loads the wasm file and generates a module object from it.
    // VlcModuleExt is an object defined in 'lib/module-loader.js' with a
    // bunch of options; also, all the fields of VlcModuleExt are added to
    // the returned Module.
    globalThis.Module = await initModule(VlcModuleExt);

    createHandlers();
    //} catch (e) {
    //    const validOptions = localStorage.getItem('valid-options');
    //    localStorage.setItem('options', validOptions);
    //    alert(e)
    //    //window.location.reload();
    //}
}

function createHandlers() {
    window.onerror = function (event) {
        // TODO: do not warn on ok events like simulating an infinite loop or exitStatus
        Module.setStatus('Exception thrown, see JavaScript console');
        // spinnerElement.style.display = 'none';
        body.dispatchEvent(isNotLoading);
        Module.setStatus = function (text) {
            if (text) Module.printErr('[post-exception status] ' + text);
        };
    };

    function handleFiles() {
        // iterator in case the user selected multiple files.
        for (var i = 0; i < this.files.length; i++) {
            var name = this.files.item(i).name;
            console.log("opened file: ", name);
            Module['vlc_access_file'][1] = this.files.item(i);
        }

        globalThis.files = this.files;

        if (this.files.length) {
            body.dispatchEvent(showCanvas);
        } else {
            body.dispatchEvent(hideCanvas);
        }
    }

    let inputElement = document.getElementById("fpicker_btn");
    inputElement.addEventListener("change", handleFiles);

    var media_player;
    let options_input = ""
    vlc_options = localStorage.getItem('options') || options_input;
    console.log("vlc.js: starting vlc.js with : " + vlc_options);
    let vlc_opts_array = vlc_options.split(' ');

    let vlc_opts_size = 0;
    for (let i in vlc_opts_array) {
        vlc_opts_size += vlc_opts_array[i].length + 1;
    }

    var buffer = Module._malloc(vlc_opts_size);
    var wrote_size = 0;
    for (let i in vlc_opts_array) {
        Module.writeAsciiToMemory(vlc_opts_array[i], buffer + wrote_size, true);
        wrote_size += vlc_opts_array[i].length + 1;
    }

    var vlc_argv = Module._malloc(vlc_opts_array.length * 4 + 4);
    var view_vlc_argv = new Uint32Array(
        Module.wasmMemory.buffer,
        vlc_argv,
        vlc_opts_array.length
    );

    wrote_size = 0;
    for (let i in vlc_opts_array) {
        view_vlc_argv[i] = buffer + wrote_size;
        wrote_size += vlc_opts_array[i].length + 1;
    }

    Module._wasm_libvlc_init(vlc_opts_array.length, vlc_argv);
    media_player = new MediaPlayer(Module, "emjsfile://1");
    media_player.set_volume(80); 

    Module._set_global_media_player(media_player.media_player_ptr);
    window.media_player = media_player;
    window.on_overlay_click = on_overlay_click;
    window.update_overlay = update_overlay;

    update_overlay();

    const playButton = document.getElementById('play-button');
    const bPlayButton = document.getElementById('bottom-play-button');

    function handlePlayPause() {
        if (globalThis.files) {
            media_player.toggle_play();
        } else {
            inputElement.click();
        }
    }

    playButton.addEventListener('click', handlePlayPause);
    bPlayButton.addEventListener('click', handlePlayPause);

    const volumeSvgWrapper = document.getElementById('volume-svg-wrapper');
    volumeSvgWrapper.addEventListener('click', function () {
        if (!window.files || !window.files.length) return;
        media_player.toggle_mute();
        update_overlay();
    });

    const progressTotal = document.getElementById('bottom-progress');
    progressTotal.addEventListener('click', function (event) {
        if (!window.files || !window.files.length) return;
        media_player.set_position(event.offsetX / progressTotal.clientWidth);
        update_overlay();
    });

    const progressVolumeTotal = document.getElementById('bottom-progress-volume');
    progressVolumeTotal.addEventListener('click', function (event) {
        if (!window.files || !window.files.length) return;
        media_player.set_volume(event.offsetX / progressVolumeTotal.clientWidth * 100);
        media_player.set_mute(0);
        update_overlay();
    });

    const nextChapter = document.getElementById('next-chapter');
    nextChapter.addEventListener('click', () => {
        if (!window.files || !window.files.length) return;
        window.media_player.next_chapter();
        update_overlay();
    });

    const previousChapter = document.getElementById('previous-chapter');
    previousChapter.addEventListener('click', () => {
        if (!window.files || !window.files.length) return;
        window.media_player.previous_chapter();
        update_overlay();
    });
};

export { initVlcAsync as init };
