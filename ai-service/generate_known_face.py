import face_recognition
import numpy as np

# Load an example image
image = face_recognition.load_image_file("person.jpg")  # Replace with your own image
encodings = face_recognition.face_encodings(image)

if encodings:
    np.save("known_face.npy", encodings[0])
    print("Known face encoding saved.")
else:
    print("No face found in the image.")
