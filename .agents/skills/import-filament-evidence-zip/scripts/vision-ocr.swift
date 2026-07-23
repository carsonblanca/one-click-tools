import CoreGraphics
import Foundation
import ImageIO
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
  let ok: Bool
  let stage: String
  let observations: [Observation]
  let observationCount: Int
  let errorDomain: String?
  let errorCode: Int?
  let errorMessage: String?
  let signal: Int?
}

private func failure(
  path: String,
  stage: String,
  domain: String,
  code: Int,
  message: String
) -> ImageResult {
  ImageResult(
    path: path,
    ok: false,
    stage: stage,
    observations: [],
    observationCount: 0,
    errorDomain: domain,
    errorCode: code,
    errorMessage: message,
    signal: nil
  )
}

private final class VisionRequestState: @unchecked Sendable {
  private let lock = NSLock()
  private var finished = false
  private var storedObservations: [VNRecognizedTextObservation] = []
  private var storedError: NSError?
  let semaphore = DispatchSemaphore(value: 0)

  func finish(observations: [VNRecognizedTextObservation] = [], error: NSError? = nil) {
    lock.lock()
    defer { lock.unlock() }
    guard !finished else { return }
    finished = true
    storedObservations = observations
    storedError = error
    semaphore.signal()
  }

  func snapshot() -> ([VNRecognizedTextObservation], NSError?) {
    lock.lock()
    defer { lock.unlock() }
    return (storedObservations, storedError)
  }
}

private func recognize(path: String) -> ImageResult {
  guard FileManager.default.fileExists(atPath: path) else {
    return failure(
      path: path,
      stage: "file_validation",
      domain: NSPOSIXErrorDomain,
      code: Int(ENOENT),
      message: "Input file does not exist"
    )
  }

  let fileURL = URL(fileURLWithPath: path)
  guard let imageSource = CGImageSourceCreateWithURL(fileURL as CFURL, nil) else {
    return failure(
      path: path,
      stage: "image_decode",
      domain: "ImageIO",
      code: 1,
      message: "CGImageSource could not open the input"
    )
  }
  guard let cgImage = CGImageSourceCreateImageAtIndex(imageSource, 0, nil) else {
    return failure(
      path: path,
      stage: "cgimage_conversion",
      domain: "ImageIO",
      code: 2,
      message: "CGImageSource could not create a CGImage"
    )
  }

  let state = VisionRequestState()
  let request = VNRecognizeTextRequest { request, error in
    if let error {
      state.finish(error: error as NSError)
      return
    }
    state.finish(observations: request.results as? [VNRecognizedTextObservation] ?? [])
  }
  request.recognitionLevel = .accurate
  request.recognitionLanguages = ["zh-Hans", "en-US"]
  request.usesLanguageCorrection = true

  DispatchQueue.global(qos: .userInitiated).async {
    autoreleasepool {
      do {
        try VNImageRequestHandler(cgImage: cgImage, options: [:]).perform([request])
      } catch {
        state.finish(error: error as NSError)
      }
    }
  }

  guard state.semaphore.wait(timeout: .now() + 90) == .success else {
    return failure(
      path: path,
      stage: "vision_completion",
      domain: "VisionOCR",
      code: 1,
      message: "VNRecognizeTextRequest completion did not execute within 90 seconds"
    )
  }

  let (recognized, requestError) = state.snapshot()
  if let requestError {
    return failure(
      path: path,
      stage: "vision_request",
      domain: requestError.domain,
      code: requestError.code,
      message: requestError.localizedDescription
    )
  }

  let observations = recognized.compactMap { result -> Observation? in
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
  return ImageResult(
    path: path,
    ok: true,
    stage: "completed",
    observations: observations,
    observationCount: observations.count,
    errorDomain: nil,
    errorCode: nil,
    errorMessage: nil,
    signal: nil
  )
}

let encoder = JSONEncoder()
encoder.outputFormatting = [.sortedKeys]
let paths = Array(CommandLine.arguments.dropFirst())
let results = paths.isEmpty
  ? [failure(
      path: "",
      stage: "argument_validation",
      domain: "VisionOCR",
      code: 2,
      message: "At least one image path is required"
    )]
  : paths.map { path in autoreleasepool { recognize(path: path) } }

do {
  FileHandle.standardOutput.write(try encoder.encode(results))
} catch {
  let nsError = error as NSError
  let fallback = """
  [{"errorCode":\(nsError.code),"errorDomain":"JSONEncoding","errorMessage":"Unable to encode OCR result","observationCount":0,"observations":[],"ok":false,"path":"","signal":null,"stage":"json_encoding"}]
  """
  FileHandle.standardOutput.write(Data(fallback.utf8))
}
