import path from 'node:path'
import { Root } from 'protobufjs'

export function loadProto(protoPath: string): Root {
  const protoDirectoryRoot = path.join(process.cwd(), 'protos')
  const root = new Root()
  root.resolvePath = function (_origin: string, target: string) {
    if (path.isAbsolute(target)) {
      return target
    }
    return path.join(protoDirectoryRoot, target)
  }
  root.loadSync(path.join(protoDirectoryRoot, protoPath))
  return root
}
