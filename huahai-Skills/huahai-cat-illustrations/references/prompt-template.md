# 生图与改图提示词模板

## 工具调用要求

每张图单独调用当前环境可用的图像生成或编辑工具，并把 `../assets/huahai-cat-character-sheet.png` 作为 reference image 传入。不要只在文字中提到参考图而不实际附带它。

## 单张生成模板

```text
Generate one standalone 16:9 horizontal Chinese article illustration.

Identity reference:
Use the attached Huahai Cat character sheet only as the canonical character identity reference. Keep the same anthropomorphic cream-white cat, oversized upright ears with pale-pink inner ears, large deep-blue eyes, forest-green varsity jacket with ivory sleeves and a small C patch, khaki cargo pants, green-white sneakers, black crossbody bag, and curled cream tail.
Ignore and do not reproduce the orange background, paper texture, FRONT/SIDE/BACK labels, Chinese view labels, three-view lineup, or static character-sheet pose. Show only the number of characters required by the concept, normally one.

Character behavior:
Huahai Cat is a curious, capable content explorer and builder. The character must perform the action that makes the concept work, not pose beside a finished diagram. Cute and friendly, but not babyish, not a sticker, not a mascot poster.

Theme:
{正文配图主题}

Core idea:
{唯一核心意思}

Visual metaphor:
{为当前内容新设计的物理隐喻}

Composition:
{花海猫的位置、动作、主要物件、信息如何变化}

Chinese handwritten labels:
{3–6 个短标注}

Visual DNA:
Pure or near-pure white background. Clean hand-drawn line art with slight natural wobble. Lots of empty space. Keep the Huahai Cat in its restrained canonical colors. Use forest green for primary structure, warm orange for the key action or path, deep blue for secondary system notes, and warning red only when necessary. The whole subject occupies about 40%–65% of the canvas.

Constraints:
One image explains one concept. No top-left type title. No PPT infographic, formal flowchart, course slide, dense UI, photorealism, glossy 3D, anime comic page, children's picture-book scene, or commercial mascot poster. Do not add extra tails, ears, limbs, bags, or characters. Do not turn the character into a fox, dog, rabbit, ordinary four-legged cat, or human child in a costume. Do not copy old Xiaohei compositions. Invent a fresh metaphor for this specific content.
```

## 修正角色漂移

```text
Edit the image while preserving the core composition and concept. Correct only the Huahai Cat identity using the attached canonical character sheet: cream-white fur, oversized upright ears with pale-pink inner ears, deep-blue eyes, forest-green varsity jacket with ivory sleeves and small C patch, khaki cargo pants, green-white sneakers, black crossbody bag, and one curled cream tail. Keep the current action and scene. Remove any species drift, wrong outfit colors, extra limbs, extra tails, duplicate bags, or character-sheet labels. Do not import the orange reference background or three-view layout.
```

## 去掉标题或错字

```text
Edit the provided illustration. Remove only the handwritten text “{要删除的文字}” and its underline or arrow if specified. Fill the area with the same clean white background. Preserve the Huahai Cat, all other labels, actions, objects, line style, composition, aspect ratio, and image quality. Do not add new text or objects.
```

## 从旧角色图重新设计

```text
Redesign this article illustration around the same core idea, using the attached Huahai Cat sheet as the only character identity reference. Replace the old actor with Huahai Cat and adapt the action so the cat genuinely drives the concept. Do not trace, recolor, or paste the new character over the old one. If the old composition depends on a Xiaohei-specific metaphor, invent a new low-tech metaphor while preserving the intended meaning. Keep a 16:9 white-background hand-drawn article-illustration style.
```
