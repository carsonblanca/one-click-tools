import AppKit
import Foundation
import Vision

struct Observation: Codable {
  let text: String
  let confidence: Float
  let x: Double
  let y: Double
  let width: Double
  let height: Double
}

struct ImageResult: Codable {
  let path: String
  let observations: [Observation]
  let error: String?
}

func recognize(path: String) -> ImageResult {
  guard
    let image = NSImage(contentsOfFile: path),
    let tiff = image.tiffRepresentation,
    let bitmap = NSBitmapImageRep(data: tiff),
    let cgImage = bitmap.cgImage
  else {
    return ImageResult(path: path, observations: [], error: "image_decode_failed")
  }

  let request = VNRecognizeTextRequest()
  request.recognitionLevel = .accurate
  request.recognitionLanguages = ["zh-Hans", "en-US"]
  request.usesLanguageCorrection = true

  do {
    try VNImageRequestHandler(cgImage: cgImage).perform([request])
    let observations = (request.results ?? []).compactMap { result -> Observation? in
      guard let candidate = result.topCandidates(1).first else { return nil }
      let box = result.boundingBox
      return Observation(
        text: candidate.string,
        confidence: candidate.confidence,
        x: box.origin.x,
        y: box.origin.y,
        width: box.size.width,
        height: box.size.height
      )
    }
    return ImageResult(path: path, observations: observations, error: nil)
  } catch {
    return ImageResult(path: path, observations: [], error: "vision_request_failed")
  }
}

let results = CommandLine.arguments.dropFirst().map { recognize(path: $0) }
let encoder = JSONEncoder()
encoder.outputFormatting = [.sortedKeys]
FileHandle.standardOutput.write(try encoder.encode(results))
