"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { RoundedBox, Cylinder, Box, Torus } from "@react-three/drei";
import * as THREE from "three";
import { type MotionValue } from "motion/react";

interface SuitcaseProps {
  progress: MotionValue<number>;
}

export default function Suitcase3D({ progress }: SuitcaseProps) {
  const mainGroupRef = useRef<THREE.Group>(null);
  const lidGroupRef = useRef<THREE.Group>(null);
  
  const boxRef = useRef<THREE.Group>(null);
  const passportRef = useRef<THREE.Group>(null);
  const phoneRef = useRef<THREE.Group>(null);
  const keysRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!mainGroupRef.current || !lidGroupRef.current) return;
    const p = progress.get();
    const time = state.clock.getElapsedTime();
    
    // POSIÇÃO X: Começa na esquerda (-2.5), vai para a direita (+3.2) e volta para a esquerda no final (-2.5)
    let targetX = -2.5;
    if (p > 0.05 && p <= 0.9) {
      const t = Math.min((p - 0.05) / 0.2, 1);
      targetX = -2.5 + (t * 5.7); // move para +3.2 na área de leitura ("Como Funciona", "Comunicação")
    }
    
    // Nudge the suitcase to the RIGHT during the 'personas' stage (around p=0.82 to 0.96)
    if (p > 0.76 && p < 0.96) {
      let nudge = 0;
      if (p <= 0.82) nudge = (p - 0.76) / 0.06;
      else if (p <= 0.90) nudge = 1;
      else nudge = 1 - ((p - 0.90) / 0.06);
      targetX += nudge * 0.8; // empurra +0.8 (vai para 4.0) na direita
    }

    if (p > 0.9) {
      const t = Math.min((p - 0.9) / 0.1, 1);
      targetX = 4.0 - (t * 6.5); // volta para -2.5
    }
    
    // ESCALA
    let targetScale = 1.2;
    if (p > 0.05) {
      const t = Math.min((p - 0.05) / 0.2, 1);
      targetScale = 1.2 - (t * 0.18);
    }
    
    // ROTAÇÃO DA MALA (Estática no início, gira durante o scroll)
    let targetRotY = 0; // Começa de frente
    if (p > 0.05) {
      targetRotY = (p - 0.05) * Math.PI * 4;
    }
    const targetRotX = Math.sin(p * Math.PI * 8) * 0.05 + 0.05;

    // ABERTURA DA TAMPA
    let lidRot = 0;
    if (p < 0.05) {
      lidRot = Math.PI * 0.6; // Começa aberta
    } else if (p > 0.9) {
      const t = Math.min((p - 0.9) / 0.1, 1);
      lidRot = t * (Math.PI * 0.6); // Abre no final
    }
    
    // OBJETOS VOADORES
    let objScale = 1;
    let objYOffset = 0;
    
    if (p > 0.02 && p <= 0.1) {
      const t = Math.min((p - 0.02) / 0.08, 1);
      objScale = 1 - t; // encolhe até sumir
      objYOffset = -t * 2.5; // cai profundamente na mala
    } else if (p > 0.1 && p <= 0.9) {
      objScale = 0;
    } else if (p > 0.9) {
      const t = Math.min((p - 0.9) / 0.1, 1);
      objScale = t; // cresce
      objYOffset = (1-t) * -2.5; // sobe do fundo da mala
    }

    // APLICANDO OS VALORES (com lerp para suavizar o scroll e as animações)
    mainGroupRef.current.position.x += (targetX - mainGroupRef.current.position.x) * 0.1;
    
    // A mala flutua muito pouco quando parada (p < 0.05)
    const floatMultiplier = p < 0.05 ? 0.02 : 0.1;
    let baseY = Math.sin(time) * floatMultiplier - (p * 1.5);
    
    // "Para quem é" (personas) -> mala mais para cima
    if (p > 0.76 && p < 0.96) {
      let upNudge = 0;
      if (p <= 0.82) upNudge = (p - 0.76) / 0.06;
      else if (p <= 0.90) upNudge = 1;
      else upNudge = 1 - ((p - 0.90) / 0.06);
      baseY += upNudge * 0.8; // move para cima em +0.8
    }

    // "CTA Final" -> subir a mala para centralizar na tela
    if (p > 0.9) {
      const t = Math.min((p - 0.9) / 0.1, 1);
      baseY += t * 1.2; // Move a mala +1.2 para cima no final
    }

    mainGroupRef.current.position.y += (baseY - mainGroupRef.current.position.y) * 0.1;
    
    mainGroupRef.current.scale.setScalar(
      mainGroupRef.current.scale.x + (targetScale - mainGroupRef.current.scale.x) * 0.1
    );
    mainGroupRef.current.rotation.y += (targetRotY - mainGroupRef.current.rotation.y) * 0.1;
    mainGroupRef.current.rotation.x += (targetRotX - mainGroupRef.current.rotation.x) * 0.1;
    mainGroupRef.current.rotation.z = Math.sin(time * 2) * floatMultiplier * 0.3;

    lidGroupRef.current.rotation.y += (-lidRot - lidGroupRef.current.rotation.y) * 0.15;

    // Animação dos objetos
    if (boxRef.current && passportRef.current && phoneRef.current && keysRef.current) {
      const objs = [boxRef.current, passportRef.current, phoneRef.current, keysRef.current];
      objs.forEach((obj, i) => {
        obj.scale.setScalar(obj.scale.x + (objScale - obj.scale.x) * 0.2);
        
        if (objScale > 0.01) {
          const offset = i * (Math.PI / 2);
          const currentRadius = 1.2 * objScale; 
          
          const targetObjX = Math.cos(offset) * currentRadius;
          const targetObjZ = Math.sin(offset) * currentRadius;
          // Subindo e descendo só um pouquinho
          const targetObjY = 2.0 + Math.sin(time * 2 + i) * 0.05 + objYOffset; 

          obj.position.x += (targetObjX - obj.position.x) * 0.1;
          obj.position.y += (targetObjY - obj.position.y) * 0.1;
          obj.position.z += (targetObjZ - obj.position.z) * 0.1;

          // Parados, apenas inclinações estéticas estáticas + leve respiro
          obj.rotation.x = 0.2 + Math.sin(time + i) * 0.02;
          obj.rotation.y = i * (Math.PI / 2) + Math.cos(time + i) * 0.02;
        } else {
          obj.position.set(0,0,0);
        }
      });
    }
  });

  return (
    <group ref={mainGroupRef}>
      
      {/* BASE DA MALA Oca */}
      <group position={[0, 0, 0]}>
        {/* Fundo */}
        <RoundedBox args={[1.5, 2, 0.1]} radius={0.02} smoothness={2} position={[0, 0, -0.25]} castShadow receiveShadow>
          <meshStandardMaterial color="#c2410c" roughness={0.7} metalness={0.1} />
        </RoundedBox>
        {/* Laterais (cima/baixo) */}
        <RoundedBox args={[1.5, 0.1, 0.2]} radius={0.02} smoothness={2} position={[0, 0.95, -0.1]} castShadow receiveShadow>
          <meshStandardMaterial color="#f97316" roughness={0.6} metalness={0.2} />
        </RoundedBox>
        <RoundedBox args={[1.5, 0.1, 0.2]} radius={0.02} smoothness={2} position={[0, -0.95, -0.1]} castShadow receiveShadow>
          <meshStandardMaterial color="#f97316" roughness={0.6} metalness={0.2} />
        </RoundedBox>
        {/* Laterais (esquerda/direita) */}
        <RoundedBox args={[0.1, 1.8, 0.2]} radius={0.02} smoothness={2} position={[-0.7, 0, -0.1]} castShadow receiveShadow>
          <meshStandardMaterial color="#f97316" roughness={0.6} metalness={0.2} />
        </RoundedBox>
        <RoundedBox args={[0.1, 1.8, 0.2]} radius={0.02} smoothness={2} position={[0.7, 0, -0.1]} castShadow receiveShadow>
          <meshStandardMaterial color="#f97316" roughness={0.6} metalness={0.2} />
        </RoundedBox>

        {/* Ribs (Detalhes traseiros) */}
        {[-0.5, -0.25, 0, 0.25, 0.5].map((x, i) => (
          <RoundedBox key={i} args={[0.08, 1.8, 0.05]} radius={0.02} position={[x, 0, -0.31]} castShadow>
            <meshStandardMaterial color="#e86100" roughness={0.6} metalness={0.2} />
          </RoundedBox>
        ))}

        {/* Alça mecanismo */}
        <RoundedBox args={[0.6, 0.1, 0.1]} radius={0.02} position={[0, 1.05, -0.15]} castShadow>
          <meshStandardMaterial color="#333333" roughness={0.7} />
        </RoundedBox>
        <Cylinder args={[0.04, 0.04, 0.8]} position={[-0.2, 1.4, -0.15]} castShadow>
           <meshStandardMaterial color="#cbd5e1" metalness={0.8} roughness={0.2} />
        </Cylinder>
        <Cylinder args={[0.04, 0.04, 0.8]} position={[0.2, 1.4, -0.15]} castShadow>
           <meshStandardMaterial color="#cbd5e1" metalness={0.8} roughness={0.2} />
        </Cylinder>
        <RoundedBox args={[0.6, 0.1, 0.15]} radius={0.04} position={[0, 1.8, -0.15]} castShadow>
           <meshStandardMaterial color="#111111" roughness={0.8} />
        </RoundedBox>

        {/* Rodinhas Traseiras */}
        <Cylinder args={[0.12, 0.12, 0.1]} position={[-0.5, -1.05, -0.15]} rotation={[0, 0, Math.PI/2]} castShadow>
           <meshStandardMaterial color="#111111" roughness={0.9} />
        </Cylinder>
        <Cylinder args={[0.12, 0.12, 0.1]} position={[0.5, -1.05, -0.15]} rotation={[0, 0, Math.PI/2]} castShadow>
           <meshStandardMaterial color="#111111" roughness={0.9} />
        </Cylinder>
      </group>

      {/* OBJETOS VOADORES */}
      {/* 1. A Caixa */}
      <group ref={boxRef}>
        <Box args={[0.8, 0.6, 0.6]} castShadow receiveShadow>
          <meshStandardMaterial color="#d4a373" roughness={0.9} />
        </Box>
        <Box args={[0.82, 0.1, 0.62]} castShadow>
          <meshStandardMaterial color="#ccd5ae" roughness={0.7} />
        </Box>
      </group>

      {/* 2. O Passaporte */}
      <group ref={passportRef}>
        <RoundedBox args={[0.5, 0.7, 0.05]} radius={0.01} castShadow receiveShadow>
          <meshStandardMaterial color="#1e3a8a" roughness={0.8} /> {/* Azul Escuro */}
        </RoundedBox>
        {/* Detalhe dourado na capa */}
        <Box args={[0.2, 0.2, 0.06]} position={[0, 0.1, 0]} castShadow>
          <meshStandardMaterial color="#fbbf24" metalness={0.8} roughness={0.2} />
        </Box>
      </group>

      {/* 3. O Celular */}
      <group ref={phoneRef}>
        <RoundedBox args={[0.4, 0.8, 0.04]} radius={0.04} castShadow receiveShadow>
          <meshStandardMaterial color="#262626" roughness={0.4} metalness={0.8} />
        </RoundedBox>
        {/* Tela brilhante */}
        <Box args={[0.36, 0.74, 0.042]} castShadow>
          <meshStandardMaterial color="#000000" roughness={0.1} metalness={0.9} />
        </Box>
      </group>

      {/* 4. O Chaveiro */}
      <group ref={keysRef}>
        <Torus args={[0.1, 0.02, 16, 32]} castShadow>
          <meshStandardMaterial color="#cbd5e1" metalness={0.9} roughness={0.1} />
        </Torus>
        <Box args={[0.08, 0.3, 0.02]} position={[0.15, -0.15, 0]} rotation={[0, 0, Math.PI/4]} castShadow>
          <meshStandardMaterial color="#fbbf24" metalness={0.8} roughness={0.2} />
        </Box>
      </group>

      {/* TAMPA DA MALA (Hinged on Left Side) */}
      <group ref={lidGroupRef} position={[-0.75, 0, 0]}>
        <group position={[0.75, 0, 0]}>
          {/* TAMPA DA MALA Oca */}
          {/* Frente da tampa */}
          <RoundedBox args={[1.5, 2, 0.1]} radius={0.02} smoothness={2} position={[0, 0, 0.25]} castShadow receiveShadow>
            <meshStandardMaterial color="#c2410c" roughness={0.7} metalness={0.1} />
          </RoundedBox>
          {/* Laterais (cima/baixo) */}
          <RoundedBox args={[1.5, 0.1, 0.2]} radius={0.02} smoothness={2} position={[0, 0.95, 0.1]} castShadow receiveShadow>
            <meshStandardMaterial color="#f97316" roughness={0.6} metalness={0.2} />
          </RoundedBox>
          <RoundedBox args={[1.5, 0.1, 0.2]} radius={0.02} smoothness={2} position={[0, -0.95, 0.1]} castShadow receiveShadow>
            <meshStandardMaterial color="#f97316" roughness={0.6} metalness={0.2} />
          </RoundedBox>
          {/* Laterais (esquerda/direita) */}
          <RoundedBox args={[0.1, 1.8, 0.2]} radius={0.02} smoothness={2} position={[-0.7, 0, 0.1]} castShadow receiveShadow>
            <meshStandardMaterial color="#f97316" roughness={0.6} metalness={0.2} />
          </RoundedBox>
          <RoundedBox args={[0.1, 1.8, 0.2]} radius={0.02} smoothness={2} position={[0.7, 0, 0.1]} castShadow receiveShadow>
            <meshStandardMaterial color="#f97316" roughness={0.6} metalness={0.2} />
          </RoundedBox>

          {/* Ribs da Tampa (Detalhes frontais) */}
          {[-0.5, -0.25, 0, 0.25, 0.5].map((x, i) => (
            <RoundedBox key={i} args={[0.08, 1.8, 0.05]} radius={0.02} position={[x, 0, 0.31]} castShadow>
              <meshStandardMaterial color="#e86100" roughness={0.6} metalness={0.2} />
            </RoundedBox>
          ))}

          {/* Rodinhas Dianteiras (Na tampa) */}
          <Cylinder args={[0.12, 0.12, 0.1]} position={[-0.5, -1.05, 0.15]} rotation={[0, 0, Math.PI/2]} castShadow>
            <meshStandardMaterial color="#111111" roughness={0.9} />
          </Cylinder>
          <Cylinder args={[0.12, 0.12, 0.1]} position={[0.5, -1.05, 0.15]} rotation={[0, 0, Math.PI/2]} castShadow>
            <meshStandardMaterial color="#111111" roughness={0.9} />
          </Cylinder>
        </group>
      </group>

    </group>
  );
}
