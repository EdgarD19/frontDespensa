import { KJUR, stob64, hextorstr } from "jsrsasign";

/**
 * Par de llaves para firmar las peticiones a QZ Tray.
 * Generado localmente para este proyecto (CN=DespensaPOS, 10 años).
 *
 * ⚠️ La clave privada viaja en el bundle: aceptable en un POS local
 * (firma solo contra qz-tray en localhost:8182). Si el front se expone
 * fuera de la red de la tienda, mover la firma a un servicio aparte.
 *
 * Firma por llamada (no se reutiliza la instancia entre concurrentes).
 */
const QZ_PRIVATE_KEY = `
-----BEGIN PRIVATE KEY-----
MIIEvwIBADANBgkqhkiG9w0BAQEFAASCBKkwggSlAgEAAoIBAQDYm1E5qlDHb8/i
V7W27LhROkeZHN1vT+jXSfZzxqdRwQvkx79KVti4fWa0LLL9JKLqPsfErZgwKcz3
NOiOKorLqo8uuKhwcZlr5MwzxJeEewcyv8nOjNw6JYxVWV995vICrlCuOUU1VLHc
dUyAXPAs+jqO9Pf7M1D9/aVpx+UCzvQwZpqYXpz+t8VeBcvBOcHV7QiCUuGgrsIo
Bjdk1HbgysDF031rhsnwFBcAW79attbBpYW6RENh9DhURBeKpOnq/YJgO9Ny1/dp
2azbmmSM6cAz8H/f6x/WocbykC975nnQPpTqlR3orbsNnWEpgrvVChRp5m8BWNct
a8z+cZ3jAgMBAAECggEBAL6gEd+579VUpZMAtb8CnUN/ErvBF2961+OACBDj5ySf
zCPPVp3JyHi0g8pU/ECkGWwlTBHe5GyenO+B9JgJAJU0yUXI5RPwJaE6fiug++dv
jmovNx88ACR8HwCN4ugecyXA2ug5JptEqjLmWCkvoX8zyI0/MW41PzYIH6b0cKsC
b/69CywOVnPD/yYNixXzjyECxRmYQk2js2xknTQYwuXh3i/6FKbKnsmT09vegWSq
VDQ8p+l4Jhe2+tb2FpI7ckJh/Aie4UI0Q90gB4DFKi8h0pxcGb3lXcCyrSZp6W0/
iSjaP5p3Q0Jzo2/oU0zIS3CTGYRsQoyl4G8B+lmCPKECgYEA+DuCSdgcZV18MJVj
Qm4k1pX7a5b1Aoxx3kPnwc2KKjNxpnCYye6NHY6aBc4rv0vcsgAz/FCXX2lqXqLf
E2n1M+FqJ21Q6DdY+0xPIWWrL1lUMNxyi7eW7ekXOdlfROAtzMiTENUSArjek7nx
ep0UuwJQEH/hFexJwuGgPIQisNcCgYEA32J3lE0rEn8CXR1flGfOm17T9C4wIvsk
XeF9vWd4Ex+hIcgUvVH6PAfFLfESYV+QjEUWlJ/FyLfxgbYmDWlqwEF7pHnR7h8e
KUIvyB+uSOhS0EcKGOZySkujKxJgqJnxEh8bvTtsNpL43jLczLF8He+52KGTQ1jO
wB5ngzew/dUCgYEA4cOV0r13zgVBTxp/JUrxvCy6dvbbrU64vXK7FLtwfsM9CSh8
/aM1uv0YPlFt3lULyuR+Y2uU0NUaRioRgyGqPl40Ytl8bUbxadTUX0aNc8nl1W6Z
y1LVNVn6osV9bTIK1aZSg0uWTt1+qZLC+kZlNVR8JxV3TK4Tw+fbCU8QEg8CgYEA
1jq1mWkkTJm3p5sa5dVkBAc+V+fPzEx0BQDSuMk5E4X63s3mbeXniJifFj8itHWU
x6EeVaygXq1hlFceSTB26yghrowRsz7uivzpnBAd8de0TABFA7pFk1DUi+MVBbyU
wB9LWABb+D6dI2M986Sm9oLIBaR2+Vh69y5xcRsAx30CgYB8aAesa5uDz+rrAqtn
OKzIAPmpXfm9omY2TlwKbJOMOigLvfUuhnClk9fwivpixS69Mqj9rO/QrA3x+Edn
RfBMnjji8yQ6n5zv/ramW1Xwetlss8ra33zY74GnSHRWZnK86TBpSpoCno8xXwP2
iI+ebvR95boztgSR42kM3ScQHw==
-----END PRIVATE KEY-----
`;

const QZ_CERT = `
-----BEGIN CERTIFICATE-----
MIICqDCCAZACCQCDriJ3lEiQnDANBgkqhkiG9w0BAQsFADAWMRQwEgYDVQQDDAtE
ZXNwZW5zYVBPUzAeFw0yNjExMTAwMjE5NDJaFw0zNjExMDcwMjE5NDJaMBYxFDAS
BgNVBAMMC0Rlc3BlbnNhUE9TMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKC
AQEA2JtROapQx2/P4le1tuy4UTpHmRzdb0/o10n2c8anUcEL5Me/SlbYuH1mtCyy
/SSi6j7HxK2YMCnM9zTojiqKy6qPLriocHGZa+TMM8SXhHsHMr/JzozcOiWMVVlf
febyAq5QrjlFNVSx3HVMgFzwLPo6jvT3+zNQ/f2lacflAs70MGaamF6c/rfFXgXL
wTnB1e0IglLhoK7CKAY3ZNR24MrAxdN9a4bJ8BQXAFu/WrbWwaWFukRDYfQ4VEQX
iqTp6v2CYDvTctf3adms25pkjOnAM/B/3+sf1qHG8pAve+Z50D6U6pUd6K27DZ1h
KYK71QoUaeZvAVjXLWvM/nGd4wIDAQABMA0GCSqGSIb3DQEBCwUAA4IBAQA2e8jJ
+Bbv8MPzuHNyvvIwpQ3o0lC/6rn3ugPl7WOnJRLrxoHCh1jJ5K+k4y7H0BGsULfb
avTW1pP6KD9mPBpiLQ1q5nq/U/u6ow0JclGmu9PZe1kMAPpSnPGuSOsSJUH9gRY5
AiqBQVeXBFFk5/Y2cg9HczzxTVXoGsPCrbJxcsWpqe/rO4+dE/KfMQw0vedhd+rF
mqgg5Ov2UJRRyFOiNnEchExOZd6UfHBfR2w2FEqkJ2oO4mANTSbEmBlx9otOGn1P
/iLLrNtPLoApc/RjDHGnsye0uBMe2vEHP0nX+Xomnua7hLuvpqaDB2OjrEWn/oNc
9UdZ2n/exCQhq39i
-----END CERTIFICATE-----
`;

function firmarPeticion(toSign) {
  const sig = new KJUR.crypto.Signature({ alg: "SHA256withRSA" });
  sig.init(QZ_PRIVATE_KEY);
  sig.updateString(toSign);
  // QZ Tray espera la firma en base64 (el resultado de jsrsasign es hex).
  return stob64(hextorstr(sig.sign()));
}

export { QZ_CERT, firmarPeticion };
