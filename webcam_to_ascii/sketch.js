const density = "$@B%8&WM#*oahkbdpqwmZO0QLCJUYXzcvunxrjft/\|()1{}[]?-_+~i!lI;:,\"^`";

let video;
let asciiDiv = document.getElementById("ascii")


function setup() {
    noCanvas();
    video = createCapture(VIDEO);
    video.size(64*2, 48*1.3);
}


function draw() {

    video.loadPixels();
    let asciiImage = document.createElement("div");

    const redSliderValue = document.getElementById("red").value;
    const greenSliderValue = document.getElementById("green").value;
    const blueSliderValue = document.getElementById("blue").value;

    asciiDiv.innerText = "";

    for (let column = 0; column < video.height; column++) {
        for (let row = 0; row < video.width; row++) {
            const pixelIndex = (row + column * video.width) * 4;
            const r =  video.pixels[pixelIndex + 0];
            const g =  video.pixels[pixelIndex + 1];
            const b =  video.pixels[pixelIndex + 2];


            const average = (r + g + b) / 3;
            const densityLength = density.length;
            const charIndex = floor(map(average, 0, 255, 0, densityLength));
            
            const character = density.charAt(charIndex);

            const characterElement = document.createElement("span");
        
            characterElement.innerText = character;
            characterElement.style.color = `rgb(${r*redSliderValue}, ${g*greenSliderValue}, ${b*blueSliderValue})`;
            // if (r > g && r > b) {
            //     characterElement.style.color = "red";
            // } else if (g > r && g > b) {
            //     characterElement.style.color = "green";
            // } else {
            //     characterElement.style.color = "blue";
            // }

            
            asciiImage.appendChild(characterElement);

            
            
        }
        const breakElement = document.createElement("br")
        asciiImage.appendChild(breakElement);
    }


    asciiDiv.appendChild(asciiImage);

}
