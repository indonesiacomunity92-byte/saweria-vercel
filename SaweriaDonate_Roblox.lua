-- ===================================================================
-- SISTEM DONASI SAWERIA (VERCEL VERSION - TANPA HOSTING SENDIRI)
-- Ganti URL_GET dan URL_DONE dengan URL Vercel kamu
-- ===================================================================

local HttpService = game:GetService("HttpService")
local MessagingService = game:GetService("MessagingService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Players = game:GetService("Players")
local ServerStorage = game:GetService("ServerStorage")
local Debris = game:GetService("Debris")

-- ============================================================
-- ✅ GANTI INI DENGAN URL VERCEL KAMU
-- Contoh: https://saweria-relay-namaproyek.vercel.app
-- ============================================================
local BASE_URL = "https://NAMA-PROYEK-KAMU.vercel.app"
local URL_GET  = BASE_URL .. "/api/get"
local URL_DONE = BASE_URL .. "/api/set?id="

-- Remote untuk notifikasi donasi di UI
local remote = ReplicatedStorage:WaitForChild("Hexsdonate"):WaitForChild("PesanDonate")

-- 📦 Folder Particles Model
local particlesFolder = ServerStorage:WaitForChild("HexsEffec")

-- ===================================================================
-- KONFIGURASI EFEK BERDASARKAN RENTANG NOMINAL
-- ===================================================================
local EFFECT_RANGES = {
	{ min = 10000,  max = 99999,      model = "Level1" },
	{ min = 100000, max = 299999,     model = "Level2" },
	{ min = 300000, max = math.huge,  model = "Level3" },
}

local MODEL_SOUND_MAP = {
	["Level1"] = "rbxassetid://14621507602",
	["Level2"] = "rbxassetid://14621507602",
	["Level3"] = "rbxassetid://14621507602",
}

local EFFECT_DURATION = 10

-- ===================================================================
-- SISTEM DONASI INTI
-- ===================================================================
local processed = {}

local function ApplyEffectToPlayerByName(donorName, modelName, soundId)
	print("🎆 MENERAPKAN EFEK:", modelName, "KE PEMAIN:", donorName)

	local player = nil
	for _, p in ipairs(Players:GetPlayers()) do
		if string.lower(p.Name) == string.lower(donorName) then
			player = p
			break
		end
	end

	if not player then
		warn("⚠️ Pemain", donorName, "tidak ditemukan di server.")
		return
	end

	local character = player.Character
	if character and character:FindFirstChild("HumanoidRootPart") then
		local model = particlesFolder:FindFirstChild(modelName)
		if not model then
			warn("⚠️ Model", modelName, "tidak ditemukan.")
			return
		end

		local hrp = character.HumanoidRootPart

		for _, obj in ipairs(model:GetDescendants()) do
			if obj:IsA("ParticleEmitter") then
				local p = obj:Clone()
				p.Parent = hrp
				Debris:AddItem(p, EFFECT_DURATION)
			end
		end

		if soundId then
			local sound = Instance.new("Sound")
			sound.SoundId = soundId
			sound.Volume = 1.5
			sound.Parent = hrp
			sound:Play()
			Debris:AddItem(sound, EFFECT_DURATION)
		end
	else
		warn("⚠️ Karakter pemain", player.Name, "belum dimuat.")
	end
end

local function SafeProcess(d)
	if not d or not d.id then return end
	if processed[d.id] then
		print("⚠ SKIP — ID sudah diproses:", d.id)
		return
	end
	processed[d.id] = true

	print("🔥 PROSES DONASI SAWERIA:", d.id)
	print("Sender:", d.donator_name, "| Amount:", d.amount_raw)

	local donorName = d.donator_name
	local donorUserId = 0
	local displayNameToShow = donorName

	local success, userIdOrError = pcall(function()
		return Players:GetUserIdFromNameAsync(donorName)
	end)

	if success and userIdOrError then
		donorUserId = userIdOrError
		local playerInServer = Players:GetPlayerByUserId(donorUserId)
		if playerInServer then
			displayNameToShow = playerInServer.DisplayName
		end
	end

	-- Kirim notifikasi ke semua client
	remote:FireAllClients(displayNameToShow, d.amount_raw, d.message, donorUserId, "IDR")

	-- Proses amount untuk efek
	local amt_cleaned = string.gsub(d.amount_raw or "0", "[^%d]", "")
	local amt = tonumber(amt_cleaned) or 0

	-- Kirim ke leaderboard
	local boardData = {
		nama    = displayNameToShow,
		nominal = amt,
		userId  = donorUserId
	}
	pcall(function()
		MessagingService:PublishAsync("DonasiDataUpdate", HttpService:JSONEncode(boardData))
	end)

	-- Terapkan efek
	local chosenEffect = nil
	for _, range in ipairs(EFFECT_RANGES) do
		if amt >= range.min and amt <= range.max then
			chosenEffect = range
			break
		end
	end

	if chosenEffect then
		local soundId = MODEL_SOUND_MAP[chosenEffect.model]
		ApplyEffectToPlayerByName(donorName, chosenEffect.model, soundId)
	end
end

-- Subscribe MessagingService (untuk multi-server)
MessagingService:SubscribeAsync("Hexsagon Studio", function(msg)
	local d = msg.Data
	SafeProcess(d)
end)

-- ===================================================================
-- POLLING LOOP — cek donasi baru setiap 5 detik
-- ===================================================================
local function FetchDonate()
	local success, result = pcall(function()
		return HttpService:GetAsync(URL_GET, true)
	end)

	if not success then
		warn("❌ HTTP ERROR GET:", result)
		return
	end

	local ok, decoded = pcall(HttpService.JSONDecode, HttpService, result)
	if not ok then
		warn("❌ JSON ERROR:", decoded)
		return
	end

	if decoded.status == "ok" and decoded.data then
		local d = decoded.data
		SafeProcess(d)

		-- Broadcast ke server lain
		pcall(function()
			MessagingService:PublishAsync("Hexsagon Studio", d)
		end)

		-- Tandai selesai di Vercel (hapus dari queue)
		pcall(function()
			HttpService:GetAsync(URL_DONE .. tostring(d.id), true)
		end)

		print("✅ Donasi diproses dan dihapus dari queue:", d.id)
	end
end

print("✅ Saweria Vercel Relay aktif — polling setiap 5 detik")
print("URL GET:", URL_GET)

while true do
	task.wait(5)
	FetchDonate()
end
