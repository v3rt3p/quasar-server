import { GlagolSecurity, quasarConfig, QuasarConfig } from "./types";
import { pki, md } from "node-forge"

export function getDefaultQuasarConfig(): QuasarConfig {
  return quasarConfig.parse({})
}

function generateGlagolKeyPair(): [string, string] {
  const key = pki.rsa.generateKeyPair(2048)
  const certificate = pki.createCertificate()
  certificate.publicKey = key.publicKey
  certificate.serialNumber = '01'
  certificate.validity.notBefore = new Date()
  certificate.validity.notAfter = new Date(Date.now() + 30 * 365 * 24 * 60 * 60 * 1000)
  const attributes = [
    {
      name: 'commonName',
      value: 'localhost'
    },
    {
      name: 'countryName',
      value: 'RU'
    },
    {
      name: 'organizationName',
      value: 'Yandex'
    }
  ]
  certificate.setSubject(attributes)
  certificate.setIssuer(attributes)
  certificate.sign(key.privateKey, md.sha256.create())

  return [pki.certificateToPem(certificate), pki.privateKeyToPem(key.privateKey)]
}

export function generateGlagolSecurity(): GlagolSecurity {
  const [certificate, privateKey] = generateGlagolKeyPair()
  return {
    certificate,
    privateKey
  }
}